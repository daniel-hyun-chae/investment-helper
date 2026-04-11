import {
  AnalysisJobSchema,
  CompanySummaryResponseSchema,
  SummaryPeriodSchema,
  SummaryRangeSchema,
  type SummaryMetricPoint
} from '@investment-helper/contracts'
import {
  fetchAndParseCorpDirectory,
  fetchLatestPeriodicDisclosure,
  fetchNormalizedFinancials,
  OpenDartSyncError,
  type QuarterlyMetricPoint
} from '@investment-helper/connectors'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

type Env = {
  ALLOW_DEV_FIXTURES?: string
  APP_ENV?: string
  LOCAL_SYNC_MODE?: string
  OPENDART_REFRESH_CHECK?: string
  SUPABASE_URL: string
  SUPABASE_SECRET_KEY: string
  TELEGRAM_BOT_TOKEN: string
  OPENDART_API_KEY: string
  ANALYSIS_QUEUE: Queue<AnalysisJob>
}

type AnalysisJob = {
  userId: string
  companyCode: string
  filingId: string
  source: 'opendart' | 'private-api'
}

type CompanyDirectoryRow = {
  corp_code: string
  corp_name: string
  corp_eng_name: string | null
  stock_code: string | null
  modify_date: string | null
}

type CompanyFinancialPointRow = {
  corp_code: string
  basis: 'CFS' | 'OFS'
  fiscal_year: number
  fiscal_quarter: number
  revenue: number | string | null
  operating_income: number | string | null
  selling_general_administrative_expense: number | string | null
  cost_of_sales: number | string | null
}

type CompanyRefreshStateRow = {
  corp_code: string
  selected_basis: 'CFS' | 'OFS'
  last_checked_at: string | null
  last_known_rcept_no: string | null
  last_known_rcept_date: string | null
  last_synced_at: string | null
}

type SubscriptionRow = {
  company_code: string
  source: string
  status: string
}

type DevFixtureSeedRequest = {
  corpCode?: string
  corpName?: string
  stockCode?: string
}

type ApiErrorPayload = {
  ok: false
  error: string
  code?: string
  detail?: string
}

const TelegramUpdateSchema = z.object({
  message: z
    .object({
      chat: z.object({ id: z.number() }),
      text: z.string().optional()
    })
    .optional()
})

const SummaryRequestSchema = z.object({
  period: SummaryPeriodSchema.default('yearly'),
  range: SummaryRangeSchema.default('5')
})

function responseHeaders(contentType = 'application/json; charset=utf-8'): HeadersInit {
  return {
    'content-type': contentType,
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization'
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders()
  })
}

function jsonApiError(payload: ApiErrorPayload, status: number): Response {
  return json(payload, status)
}

function isTruthy(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  const normalized = value.trim().toLowerCase()
  return !['0', 'false', 'off', 'no'].includes(normalized)
}

function isDevelopmentEnv(env: Env): boolean {
  return (env.APP_ENV ?? 'development').toLowerCase() !== 'production'
}

function shouldCheckOpenDartRefresh(env: Env): boolean {
  if (env.OPENDART_REFRESH_CHECK === undefined) {
    return true
  }
  return isTruthy(env.OPENDART_REFRESH_CHECK)
}

function isLocalRequest(request: Request): boolean {
  const hostname = new URL(request.url).hostname
  return hostname === '127.0.0.1' || hostname === 'localhost'
}

function isLocalSupabaseUrl(env: Env): boolean {
  const raw = (env.SUPABASE_URL ?? '').trim()
  if (!raw) {
    return false
  }

  try {
    const hostname = new URL(raw).hostname
    return hostname === '127.0.0.1' || hostname === 'localhost'
  } catch {
    return false
  }
}

function allowDevFixtures(request: Request, env: Env): boolean {
  return isDevelopmentEnv(env) && isTruthy(env.ALLOW_DEV_FIXTURES) && isLocalRequest(request)
}

function chunkArray<T>(input: T[], size: number): T[][] {
  if (size <= 0) {
    return [input]
  }
  const output: T[][] = []
  for (let i = 0; i < input.length; i += size) {
    output.push(input.slice(i, i + size))
  }
  return output
}

function normalizeNumeric(value: string | number | null): number | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function sumNullable(values: Array<number | null>): number | null {
  const numericValues = values.filter((value): value is number => value !== null)
  if (numericValues.length !== values.length) {
    return null
  }
  return numericValues.reduce((acc, value) => acc + value, 0)
}

function formatTtmLabel(fiscalYear: number, fiscalQuarter: number): string {
  return `${fiscalYear}Q${fiscalQuarter} TTM`
}

function getCurrentYearUtc(): number {
  return new Date().getUTCFullYear()
}

function minYearForRange(range: '5' | '10'): number {
  const years = Number(range)
  return getCurrentYearUtc() - years + 1
}

function toQuarterlyMetricPoints(rows: CompanyFinancialPointRow[]): QuarterlyMetricPoint[] {
  return rows
    .map((row) => ({
      fiscalYear: row.fiscal_year,
      fiscalQuarter: row.fiscal_quarter as 1 | 2 | 3 | 4,
      revenue: normalizeNumeric(row.revenue),
      operatingIncome: normalizeNumeric(row.operating_income),
      sellingGeneralAdministrativeExpense: normalizeNumeric(row.selling_general_administrative_expense),
      costOfSales: normalizeNumeric(row.cost_of_sales)
    }))
    .sort((a, b) => {
      if (a.fiscalYear !== b.fiscalYear) {
        return a.fiscalYear - b.fiscalYear
      }
      return a.fiscalQuarter - b.fiscalQuarter
    })
}

function toSummaryPoints(
  quarterlyPoints: QuarterlyMetricPoint[],
  period: 'yearly' | 'quarterly' | 'ttm',
  range: '5' | '10'
): SummaryMetricPoint[] {
  const minYear = minYearForRange(range)
  const rangedQuarterly = quarterlyPoints.filter((point) => point.fiscalYear >= minYear)

  if (period === 'quarterly') {
    return rangedQuarterly.map((point) => ({
      label: `${point.fiscalYear}Q${point.fiscalQuarter}`,
      fiscalYear: point.fiscalYear,
      fiscalQuarter: point.fiscalQuarter,
      revenue: point.revenue,
      operatingIncome: point.operatingIncome,
      sellingGeneralAdministrativeExpense: point.sellingGeneralAdministrativeExpense,
      costOfSales: point.costOfSales
    }))
  }

  if (period === 'ttm') {
    const rolling: SummaryMetricPoint[] = []
    for (let i = 3; i < rangedQuarterly.length; i += 1) {
      const group = rangedQuarterly.slice(i - 3, i + 1)
      const anchor = rangedQuarterly[i]
      rolling.push({
        label: formatTtmLabel(anchor.fiscalYear, anchor.fiscalQuarter),
        fiscalYear: anchor.fiscalYear,
        fiscalQuarter: anchor.fiscalQuarter,
        revenue: sumNullable(group.map((item) => item.revenue)),
        operatingIncome: sumNullable(group.map((item) => item.operatingIncome)),
        sellingGeneralAdministrativeExpense: sumNullable(
          group.map((item) => item.sellingGeneralAdministrativeExpense)
        ),
        costOfSales: sumNullable(group.map((item) => item.costOfSales))
      })
    }
    return rolling
  }

  const byYear = new Map<number, QuarterlyMetricPoint[]>()
  for (const point of rangedQuarterly) {
    const existing = byYear.get(point.fiscalYear) ?? []
    existing.push(point)
    byYear.set(point.fiscalYear, existing)
  }

  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, points]) => ({
      label: String(year),
      fiscalYear: year,
      fiscalQuarter: null,
      revenue: sumNullable(points.map((item) => item.revenue)),
      operatingIncome: sumNullable(points.map((item) => item.operatingIncome)),
      sellingGeneralAdministrativeExpense: sumNullable(
        points.map((item) => item.sellingGeneralAdministrativeExpense)
      ),
      costOfSales: sumNullable(points.map((item) => item.costOfSales))
    }))
}

function validateCorpCode(raw: string): string {
  const normalized = raw.trim()
  if (!/^\d{8}$/.test(normalized)) {
    throw new Error('corpCode must be an 8-digit string')
  }
  return normalized
}

function createSupabaseClientFromEnv(env: Env): SupabaseClient {
  const url = (env.SUPABASE_URL ?? '').trim().replace(/^['"]|['"]$/g, '')
  if (!url || !env.SUPABASE_SECRET_KEY) {
    throw new Error('Supabase configuration missing')
  }
  return createClient(url, env.SUPABASE_SECRET_KEY)
}

async function upsertCompanyDirectory(env: Env, supabase: SupabaseClient): Promise<number> {
  const directory = await fetchAndParseCorpDirectory(env.OPENDART_API_KEY)

  const rows = directory.map((entry) => ({
    corp_code: entry.corpCode,
    corp_name: entry.corpName,
    corp_eng_name: entry.corpEngName ?? null,
    stock_code: entry.stockCode ?? null,
    modify_date: entry.modifyDate ?? null
  }))

  for (const chunk of chunkArray(rows, 1000)) {
    const { error } = await supabase
      .from('company_directory')
      .upsert(chunk, { onConflict: 'corp_code', ignoreDuplicates: false })
    if (error) {
      throw new Error(`company_directory upsert failed: ${error.message}`)
    }
  }

  return rows.length
}

async function shouldRefreshCompanyFinancials(
  env: Env,
  supabase: SupabaseClient,
  corpCode: string
): Promise<{
  refresh: boolean
  latestDisclosureRceptNo: string | null
  latestDisclosureRceptDate: string | null
}> {
  const refreshStateResult = await supabase
    .from('company_refresh_state')
    .select('last_checked_at,last_known_rcept_no')
    .eq('corp_code', corpCode)
    .maybeSingle()

  if (refreshStateResult.error) {
    throw new Error(`company_refresh_state read failed: ${refreshStateResult.error.message}`)
  }

  const refreshState = refreshStateResult.data as
    | { last_checked_at: string | null; last_known_rcept_no: string | null }
    | null

  const countResult = await supabase
    .from('company_financial_points')
    .select('id', { count: 'exact', head: true })
    .eq('corp_code', corpCode)

  if (countResult.error) {
    throw new Error(`company_financial_points count failed: ${countResult.error.message}`)
  }

  const latestDisclosure = shouldCheckOpenDartRefresh(env)
    ? await fetchLatestPeriodicDisclosure(
        env.OPENDART_API_KEY,
        corpCode,
        refreshState?.last_checked_at ?? undefined
      )
    : null

  const hasCache = (countResult.count ?? 0) > 0
  const hasNewDisclosure = shouldCheckOpenDartRefresh(env)
    ? latestDisclosure?.rceptNo !== undefined &&
      latestDisclosure?.rceptNo !== null &&
      latestDisclosure.rceptNo !== (refreshState?.last_known_rcept_no ?? null)
    : false

  return {
    refresh: !hasCache || hasNewDisclosure,
    latestDisclosureRceptNo: latestDisclosure?.rceptNo ?? null,
    latestDisclosureRceptDate: latestDisclosure?.rceptDate ?? null
  }
}

async function refreshCompanyFinancials(
  env: Env,
  supabase: SupabaseClient,
  corpCode: string,
  latestDisclosureRceptNo: string | null,
  latestDisclosureRceptDate: string | null
): Promise<'CFS' | 'OFS'> {
  const endYear = getCurrentYearUtc()
  const startYear = endYear - 10
  const normalized = await fetchNormalizedFinancials(env.OPENDART_API_KEY, corpCode, startYear, endYear)

  const { error: deleteError } = await supabase
    .from('company_financial_points')
    .delete()
    .eq('corp_code', corpCode)

  if (deleteError) {
    throw new Error(`company_financial_points delete failed: ${deleteError.message}`)
  }

  const rows = ([
    ...normalized.pointsByBasis.CFS.map((point) => ({
      corp_code: corpCode,
      basis: 'CFS' as const,
      fiscal_year: point.fiscalYear,
      fiscal_quarter: point.fiscalQuarter,
      revenue: point.revenue,
      operating_income: point.operatingIncome,
      selling_general_administrative_expense: point.sellingGeneralAdministrativeExpense,
      cost_of_sales: point.costOfSales,
      source_rcept_no: latestDisclosureRceptNo
    })),
    ...normalized.pointsByBasis.OFS.map((point) => ({
      corp_code: corpCode,
      basis: 'OFS' as const,
      fiscal_year: point.fiscalYear,
      fiscal_quarter: point.fiscalQuarter,
      revenue: point.revenue,
      operating_income: point.operatingIncome,
      selling_general_administrative_expense: point.sellingGeneralAdministrativeExpense,
      cost_of_sales: point.costOfSales,
      source_rcept_no: latestDisclosureRceptNo
    }))
  ] satisfies Array<Record<string, unknown>>)

  for (const chunk of chunkArray(rows, 1000)) {
    if (chunk.length === 0) {
      continue
    }
    const { error } = await supabase.from('company_financial_points').insert(chunk)
    if (error) {
      throw new Error(`company_financial_points insert failed: ${error.message}`)
    }
  }

  const upsertRefreshResult = await supabase.from('company_refresh_state').upsert(
    {
      corp_code: corpCode,
      selected_basis: normalized.selectedBasis,
      last_checked_at: new Date().toISOString(),
      last_known_rcept_no: latestDisclosureRceptNo,
      last_known_rcept_date: latestDisclosureRceptDate,
      last_synced_at: new Date().toISOString()
    },
    { onConflict: 'corp_code' }
  )

  if (upsertRefreshResult.error) {
    throw new Error(`company_refresh_state upsert failed: ${upsertRefreshResult.error.message}`)
  }

  return normalized.selectedBasis
}

async function determineSelectedBasis(
  supabase: SupabaseClient,
  corpCode: string,
  preferredBasis: 'CFS' | 'OFS'
): Promise<'CFS' | 'OFS'> {
  const preferredCount = await supabase
    .from('company_financial_points')
    .select('id', { count: 'exact', head: true })
    .eq('corp_code', corpCode)
    .eq('basis', preferredBasis)

  if (preferredCount.error) {
    throw new Error(`preferred basis count failed: ${preferredCount.error.message}`)
  }

  if ((preferredCount.count ?? 0) > 0) {
    return preferredBasis
  }

  return preferredBasis === 'CFS' ? 'OFS' : 'CFS'
}

async function getCompanySummary(
  env: Env,
  supabase: SupabaseClient,
  corpCode: string,
  period: 'yearly' | 'quarterly' | 'ttm',
  range: '5' | '10'
) {
  let companyResult = await supabase
    .from('company_directory')
    .select('corp_code,corp_name')
    .eq('corp_code', corpCode)
    .maybeSingle()

  if (companyResult.error) {
    throw new Error(`company_directory read failed: ${companyResult.error.message}`)
  }

  if (!companyResult.data) {
    return json(
      {
        ok: false,
        error: 'Company directory not synced. Run POST /api/companies/sync first.',
        code: 'DIRECTORY_NOT_SYNCED'
      },
      409
    )
  }

  const refreshDecision = await shouldRefreshCompanyFinancials(env, supabase, corpCode)

  let selectedBasis: 'CFS' | 'OFS' = 'CFS'
  if (refreshDecision.refresh) {
    selectedBasis = await refreshCompanyFinancials(
      env,
      supabase,
      corpCode,
      refreshDecision.latestDisclosureRceptNo,
      refreshDecision.latestDisclosureRceptDate
    )
  } else {
    const refreshStateResult = await supabase
      .from('company_refresh_state')
      .select('selected_basis')
      .eq('corp_code', corpCode)
      .maybeSingle()

    if (refreshStateResult.error) {
      throw new Error(`company_refresh_state fetch failed: ${refreshStateResult.error.message}`)
    }

    selectedBasis = (refreshStateResult.data?.selected_basis as 'CFS' | 'OFS' | undefined) ?? 'CFS'

    const { error: updateCheckError } = await supabase
      .from('company_refresh_state')
      .upsert(
        {
          corp_code: corpCode,
          selected_basis: selectedBasis,
          last_checked_at: new Date().toISOString(),
          last_known_rcept_no: refreshDecision.latestDisclosureRceptNo,
          last_known_rcept_date: refreshDecision.latestDisclosureRceptDate
        },
        { onConflict: 'corp_code' }
      )

    if (updateCheckError) {
      throw new Error(`company_refresh_state touch failed: ${updateCheckError.message}`)
    }
  }

  selectedBasis = await determineSelectedBasis(supabase, corpCode, selectedBasis)

  const pointsResult = await supabase
    .from('company_financial_points')
    .select(
      'corp_code,basis,fiscal_year,fiscal_quarter,revenue,operating_income,selling_general_administrative_expense,cost_of_sales'
    )
    .eq('corp_code', corpCode)
    .eq('basis', selectedBasis)
    .order('fiscal_year', { ascending: true })
    .order('fiscal_quarter', { ascending: true })

  if (pointsResult.error) {
    throw new Error(`company_financial_points read failed: ${pointsResult.error.message}`)
  }

  const quarterlyPoints = toQuarterlyMetricPoints((pointsResult.data ?? []) as CompanyFinancialPointRow[])
  const points = toSummaryPoints(quarterlyPoints, period, range)

  const payload = CompanySummaryResponseSchema.parse({
    corpCode,
    corpName: (companyResult.data as { corp_name: string }).corp_name,
    period,
    rangeYears: range,
    basis: selectedBasis,
    generatedAt: new Date().toISOString(),
    points,
    marketCap: {
      available: false,
      reason: 'not_supported_by_opendart_v1'
    }
  })

  return json({ ok: true, data: payload })
}

async function handleTelegramWebhook(request: Request, env: Env): Promise<Response> {
  const payload = await request.json()
  const parsed = TelegramUpdateSchema.safeParse(payload)

  if (!parsed.success) {
    return json({ ok: false, error: 'Invalid Telegram payload' }, 400)
  }

  const text = parsed.data.message?.text?.trim() ?? ''
  const chatId = parsed.data.message?.chat.id

  if (!chatId) {
    return json({ ok: true })
  }

  if (text.startsWith('/start')) {
    return json({ ok: true, message: 'Welcome to investment-helper.' })
  }

  if (text.startsWith('/watch ')) {
    const companyCode = text.replace('/watch', '').trim()
    if (!companyCode) {
      return json({ ok: false, error: 'Company code required' }, 400)
    }

    const supabase = createSupabaseClientFromEnv(env)
    const { error } = await supabase.from('subscriptions').upsert(
      {
        telegram_user_id: String(chatId),
        company_code: companyCode,
        source: 'opendart',
        status: 'active'
      },
      { onConflict: 'telegram_user_id,company_code,source' }
    )

    if (error) {
      return json({ ok: false, error: 'Failed to save subscription', reason: error.message }, 500)
    }

    return json({ ok: true, message: `Watching ${companyCode}` })
  }

  if (text.startsWith('/unwatch ')) {
    const companyCode = text.replace('/unwatch', '').trim()
    if (!companyCode) {
      return json({ ok: false, error: 'Company code required' }, 400)
    }

    const supabase = createSupabaseClientFromEnv(env)
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'inactive' })
      .eq('telegram_user_id', String(chatId))
      .eq('company_code', companyCode)
      .eq('source', 'opendart')

    if (error) {
      return json({ ok: false, error: 'Failed to update subscription', reason: error.message }, 500)
    }

    return json({ ok: true, message: `Unwatched ${companyCode}` })
  }

  if (text.startsWith('/list')) {
    const supabase = createSupabaseClientFromEnv(env)
    const result = await supabase
      .from('subscriptions')
      .select('company_code,source,status')
      .eq('telegram_user_id', String(chatId))
      .order('created_at', { ascending: false })

    if (result.error) {
      return json({ ok: false, error: 'Failed to load subscriptions', reason: result.error.message }, 500)
    }

    const active = ((result.data ?? []) as SubscriptionRow[]).filter((row) => row.status === 'active')
    return json({
      ok: true,
      subscriptions: active.map((row) => ({
        companyCode: row.company_code,
        source: row.source,
        status: row.status
      }))
    })
  }

  return json({ ok: true })
}

async function syncCompanyDirectory(env: Env, supabase: SupabaseClient): Promise<Response> {
  try {
    const count = await upsertCompanyDirectory(env, supabase)
    return json({ ok: true, imported: count })
  } catch (error) {
    if (error instanceof OpenDartSyncError) {
      if (error.code === 'OPENDART_SERVICE_UNAVAILABLE' || error.code === 'OPENDART_RATE_LIMITED') {
        const fallbackCountResult = await supabase
          .from('company_directory')
          .select('corp_code', { count: 'exact', head: true })

        if (!fallbackCountResult.error && (fallbackCountResult.count ?? 0) > 0) {
          return json({
            ok: true,
            imported: fallbackCountResult.count ?? 0,
            syncSkipped: true,
            warningCode: error.code,
            warningMessage: error.message
          })
        }

        return jsonApiError(
          {
            ok: false,
            error: error.message,
            code: error.code,
            detail: error.detail
          },
          503
        )
      }

      return jsonApiError(
        {
          ok: false,
          error: error.message,
          code: error.code,
          detail: error.detail
        },
        502
      )
    }

    if (error instanceof Error) {
      return jsonApiError(
        {
          ok: false,
          error: 'Failed to sync company directory.',
          code: 'DIRECTORY_SYNC_FAILED',
          detail: error.message
        },
        500
      )
    }

    return jsonApiError(
      {
        ok: false,
        error: 'Failed to sync company directory.',
        code: 'DIRECTORY_SYNC_FAILED'
      },
      500
    )
  }
}

async function localSyncCompanyDirectory(supabase: SupabaseClient): Promise<Response> {
  const fixtureRows: CompanyDirectoryRow[] = [
    {
      corp_code: '00126380',
      corp_name: 'NAVER',
      corp_eng_name: 'NAVER',
      stock_code: '035420',
      modify_date: '20260411'
    },
    {
      corp_code: '00164779',
      corp_name: 'KAKAO',
      corp_eng_name: 'KAKAO',
      stock_code: '035720',
      modify_date: '20260411'
    }
  ]

  const { error } = await supabase
    .from('company_directory')
    .upsert(fixtureRows, { onConflict: 'corp_code', ignoreDuplicates: false })

  if (error) {
    return jsonApiError(
      {
        ok: false,
        error: 'Failed to sync company directory.',
        code: 'DIRECTORY_SYNC_FAILED',
        detail: error.message
      },
      500
    )
  }

  return json({ ok: true, imported: fixtureRows.length, localMode: true })
}

async function handleCompanySync(request: Request, env: Env): Promise<Response> {
  const supabase = createSupabaseClientFromEnv(env)

  if (request.method === 'GET') {
    const result = await supabase
      .from('company_directory')
      .select('corp_code', { count: 'exact', head: true })

    if (result.error) {
      return json({ ok: false, error: `sync status failed: ${result.error.message}` }, 500)
    }

    return json({
      ok: true,
      synced: (result.count ?? 0) > 0,
      count: result.count ?? 0
    })
  }

  if (request.method === 'POST') {
    if (allowDevFixtures(request, env) && isTruthy(env.LOCAL_SYNC_MODE)) {
      return localSyncCompanyDirectory(supabase)
    }

    return syncCompanyDirectory(env, supabase)
  }

  return json({ ok: false, error: 'Method Not Allowed' }, 405)
}

async function handleSearchCompanies(request: Request, env: Env): Promise<Response> {
  const supabase = createSupabaseClientFromEnv(env)
  const url = new URL(request.url)
  const query = (url.searchParams.get('q') ?? '').trim()
  const limit = Number(url.searchParams.get('limit') ?? '20')

  const directoryCount = await supabase
    .from('company_directory')
    .select('corp_code', { count: 'exact', head: true })

  if (directoryCount.error) {
    return json({ ok: false, error: `directory count failed: ${directoryCount.error.message}` }, 500)
  }

  if ((directoryCount.count ?? 0) === 0) {
    return json(
      {
        ok: false,
        error: 'Company directory not synced. Run POST /api/companies/sync first.',
        code: 'DIRECTORY_NOT_SYNCED'
      },
      409
    )
  }

  if (!query) {
    return json({ ok: true, data: [] })
  }

  const rpcResult = await supabase.rpc('search_company_directory', {
    search_text: query,
    limit_count: Number.isFinite(limit) ? limit : 20
  })

  if (rpcResult.error) {
    return json({ ok: false, error: `search failed: ${rpcResult.error.message}` }, 500)
  }

  return json({ ok: true, data: rpcResult.data ?? [] })
}

async function handleDevFixtureSeed(request: Request, env: Env): Promise<Response> {
  if (!allowDevFixtures(request, env)) {
    return json({ ok: false, error: 'Not Found' }, 404)
  }

  const supabase = createSupabaseClientFromEnv(env)

  let payload: DevFixtureSeedRequest = {}
  try {
    payload = request.method === 'POST' ? ((await request.json()) as DevFixtureSeedRequest) : {}
  } catch {
    payload = {}
  }

  const corpCode = (payload.corpCode ?? '00126380').trim()
  const corpName = (payload.corpName ?? 'NAVER').trim()
  const stockCode = (payload.stockCode ?? '035420').trim()

  const { error: companyError } = await supabase.from('company_directory').upsert(
    {
      corp_code: corpCode,
      corp_name: corpName,
      corp_eng_name: corpName,
      stock_code: stockCode,
      modify_date: '20260411'
    },
    { onConflict: 'corp_code' }
  )

  if (companyError) {
    return json({ ok: false, error: `fixture company upsert failed: ${companyError.message}` }, 500)
  }

  const baseYear = getCurrentYearUtc() - 3
  const fixtureRows = [
    { fiscal_year: baseYear, fiscal_quarter: 1, revenue: 100000, operating_income: 20000, sga: 30000, cogs: 45000 },
    { fiscal_year: baseYear, fiscal_quarter: 2, revenue: 110000, operating_income: 22000, sga: 32000, cogs: 47000 },
    { fiscal_year: baseYear, fiscal_quarter: 3, revenue: 120000, operating_income: 24000, sga: 35000, cogs: 50000 },
    { fiscal_year: baseYear, fiscal_quarter: 4, revenue: 130000, operating_income: 26000, sga: 36000, cogs: 52000 },
    { fiscal_year: baseYear + 1, fiscal_quarter: 1, revenue: 135000, operating_income: 27000, sga: 37000, cogs: 53000 },
    { fiscal_year: baseYear + 1, fiscal_quarter: 2, revenue: 145000, operating_income: 29000, sga: 39000, cogs: 55000 },
    { fiscal_year: baseYear + 1, fiscal_quarter: 3, revenue: 155000, operating_income: 31000, sga: 41000, cogs: 57000 },
    { fiscal_year: baseYear + 1, fiscal_quarter: 4, revenue: 165000, operating_income: 33000, sga: 43000, cogs: 59000 }
  ]

  const { error: cleanupError } = await supabase
    .from('company_financial_points')
    .delete()
    .eq('corp_code', corpCode)

  if (cleanupError) {
    return json({ ok: false, error: `fixture cleanup failed: ${cleanupError.message}` }, 500)
  }

  const normalizedRows = fixtureRows.map((row) => ({
    corp_code: corpCode,
    basis: 'CFS' as const,
    fiscal_year: row.fiscal_year,
    fiscal_quarter: row.fiscal_quarter,
    revenue: row.revenue,
    operating_income: row.operating_income,
    selling_general_administrative_expense: row.sga,
    cost_of_sales: row.cogs,
    source_rcept_no: 'fixture'
  }))

  const { error: pointsError } = await supabase.from('company_financial_points').insert(normalizedRows)

  if (pointsError) {
    return json({ ok: false, error: `fixture points insert failed: ${pointsError.message}` }, 500)
  }

  const { error: refreshError } = await supabase.from('company_refresh_state').upsert(
    {
      corp_code: corpCode,
      selected_basis: 'CFS',
      last_checked_at: new Date().toISOString(),
      last_known_rcept_no: 'fixture',
      last_known_rcept_date: '20260411',
      last_synced_at: new Date().toISOString()
    },
    { onConflict: 'corp_code' }
  )

  if (refreshError) {
    return json({ ok: false, error: `fixture refresh upsert failed: ${refreshError.message}` }, 500)
  }

  return json({ ok: true, corpCode, corpName, insertedPoints: normalizedRows.length })
}

async function handleDevFixtureReset(request: Request, env: Env): Promise<Response> {
  if (!allowDevFixtures(request, env)) {
    return json({ ok: false, error: 'Not Found' }, 404)
  }

  const supabase = createSupabaseClientFromEnv(env)

  const { error: pointsError } = await supabase.from('company_financial_points').delete().neq('corp_code', '')
  if (pointsError) {
    return json({ ok: false, error: `fixture reset points failed: ${pointsError.message}` }, 500)
  }

  const { error: refreshError } = await supabase.from('company_refresh_state').delete().neq('corp_code', '')
  if (refreshError) {
    return json({ ok: false, error: `fixture reset refresh failed: ${refreshError.message}` }, 500)
  }

  const { error: companiesError } = await supabase.from('company_directory').delete().neq('corp_code', '')
  if (companiesError) {
    return json({ ok: false, error: `fixture reset directory failed: ${companiesError.message}` }, 500)
  }

  return json({ ok: true })
}

async function handleSummaryRequest(request: Request, env: Env, corpCodeRaw: string): Promise<Response> {
  const supabase = createSupabaseClientFromEnv(env)
  const corpCode = validateCorpCode(corpCodeRaw)
  const url = new URL(request.url)
  const parsed = SummaryRequestSchema.safeParse({
    period: url.searchParams.get('period') ?? undefined,
    range: url.searchParams.get('range') ?? undefined
  })

  if (!parsed.success) {
    return json({ ok: false, error: 'Invalid period/range query' }, 400)
  }

  return getCompanySummary(env, supabase, corpCode, parsed.data.period, parsed.data.range)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const { pathname } = new URL(request.url)

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: responseHeaders('text/plain; charset=utf-8') })
      }

      if (pathname === '/health') {
        return json({ ok: true, service: 'bot-worker' })
      }

      if (pathname === '/telegram/webhook' && request.method === 'POST') {
        return handleTelegramWebhook(request, env)
      }

      if (pathname === '/admin/health') {
        return json({ ok: true, ingestion: 'unknown', queues: 'configured' })
      }

      if (pathname === '/api/opendart/sync-companies' && request.method === 'POST') {
        const supabase = createSupabaseClientFromEnv(env)
        return syncCompanyDirectory(env, supabase)
      }

      if (pathname === '/api/companies/sync' && (request.method === 'GET' || request.method === 'POST')) {
        return handleCompanySync(request, env)
      }

      if (pathname === '/api/companies/search' && request.method === 'GET') {
        return handleSearchCompanies(request, env)
      }

      if (pathname === '/api/dev/fixtures/seed' && request.method === 'POST') {
        return handleDevFixtureSeed(request, env)
      }

      if (pathname === '/api/dev/fixtures/reset' && request.method === 'POST') {
        return handleDevFixtureReset(request, env)
      }

      if (pathname === '/api/dev/fixtures/seed' && request.method === 'GET') {
        return json({ ok: true, hint: 'use POST /api/dev/fixtures/seed to create deterministic local fixtures' })
      }

      const summaryMatch = pathname.match(/^\/api\/companies\/(\d{8})\/summary$/)
      if (summaryMatch && request.method === 'GET') {
        return handleSummaryRequest(request, env, summaryMatch[1])
      }

      return json({ ok: false, error: 'Not Found' }, 404)
    } catch (error) {
      return json(
        {
          ok: false,
          error: error instanceof Error ? error.message : 'Internal worker error'
        },
        500
      )
    }
  },

  async queue(batch: MessageBatch<AnalysisJob>): Promise<void> {
    for (const message of batch.messages) {
      const parsed = AnalysisJobSchema.safeParse(message.body)
      if (!parsed.success) {
        console.error('invalid_analysis_job_payload', {
          issues: parsed.error.issues
        })
        message.ack()
        continue
      }

      console.log('analysis-job', parsed.data)
      message.ack()
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const payload = AnalysisJobSchema.parse({
      userId: 'bootstrap-user',
      companyCode: '005930',
      filingId: `cron-${Date.now()}`,
      source: 'opendart'
    })

    await env.ANALYSIS_QUEUE.send(payload)
  }
}
