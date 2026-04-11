import {
  CompanyDirectoryEntrySchema,
  FilingEventSchema,
  type CompanyDirectoryEntry,
  type FilingEvent
} from '@investment-helper/contracts'
import { XMLParser } from 'fast-xml-parser'
import JSZip from 'jszip'

export type ConnectorContext = {
  opendartApiKey: string
}

export interface Connector {
  source: 'opendart' | 'private-api'
  poll: (ctx: ConnectorContext) => Promise<FilingEvent[]>
}

export const openDartConnector: Connector = {
  source: 'opendart',
  async poll(_ctx) {
    const sample: FilingEvent = {
      id: `opendart-${Date.now()}`,
      source: 'opendart',
      companyCode: '005930',
      publishedAt: new Date().toISOString(),
      summary: 'Sample disclosure event from OpenDART connector scaffold.'
    }

    return [FilingEventSchema.parse(sample)]
  }
}

const OPEN_DART_API_BASE = 'https://opendart.fss.or.kr/api'

const REPORT_CODES = [
  { reportCode: '11013', quarter: 1 },
  { reportCode: '11012', quarter: 2 },
  { reportCode: '11014', quarter: 3 },
  { reportCode: '11011', quarter: 4 }
] as const

type FinancialMetricKey = 'revenue' | 'operatingIncome' | 'sellingGeneralAdministrativeExpense' | 'costOfSales'

type ApiListResponse<T> = {
  status: string
  message: string
  list?: T[]
}

type OpenDartAccountRow = {
  rcept_no?: string
  fs_div?: string
  account_nm?: string
  thstrm_amount?: string
  thstrm_add_amount?: string
}

type PeriodicDisclosureSummary = {
  rceptNo: string
  rceptDate: string
}

export type QuarterlyMetricPoint = {
  fiscalYear: number
  fiscalQuarter: 1 | 2 | 3 | 4
  revenue: number | null
  operatingIncome: number | null
  sellingGeneralAdministrativeExpense: number | null
  costOfSales: number | null
}

export type NormalizedFinancialResult = {
  pointsByBasis: Record<'CFS' | 'OFS', QuarterlyMetricPoint[]>
  selectedBasis: 'CFS' | 'OFS'
}

function formatDateYYYYMMDD(value: Date): string {
  const year = String(value.getUTCFullYear())
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function formatYearAndQuarterLabel(year: number, quarter: number): string {
  return `${year}-Q${quarter}`
}

function normalizeNullableNumber(raw: string | null | undefined): number | null {
  if (!raw) {
    return null
  }

  const trimmed = raw.trim()
  if (!trimmed || trimmed === '-' || trimmed.toUpperCase() === 'N/A') {
    return null
  }

  const normalized = trimmed.replace(/,/g, '')
  const value = Number(normalized)

  if (!Number.isFinite(value)) {
    return null
  }

  return value
}

function maybeSubtract(a: number | null, b: number | null): number | null {
  if (a === null || b === null) {
    return null
  }
  return a - b
}

function buildOpenDartUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${OPEN_DART_API_BASE}/${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}

async function fetchOpenDartJson<T>(path: string, params: Record<string, string>): Promise<ApiListResponse<T>> {
  const response = await fetch(buildOpenDartUrl(path, params))

  if (!response.ok) {
    throw new Error(`OpenDART request failed with status ${response.status}`)
  }

  const data = (await response.json()) as ApiListResponse<T>
  return data
}

function chooseAmountField(row: OpenDartAccountRow): number | null {
  return normalizeNullableNumber(row.thstrm_add_amount ?? row.thstrm_amount)
}

const METRIC_PATTERNS: Record<FinancialMetricKey, RegExp[]> = {
  revenue: [/\uB9E4\uCD9C\uC561/, /\uC601\uC5C5\uC218\uC775/, /\uC218\uC775/],
  operatingIncome: [/\uC601\uC5C5\uC774\uC775/],
  sellingGeneralAdministrativeExpense: [
    /\uD310\uB9E4\uBE44\uC640\uAD00\uB9AC\uBE44/,
    /\uD310\uB9E4\uBE44\uC640\s*\uAD00\uB9AC\uBE44/
  ],
  costOfSales: [/\uB9E4\uCD9C\uC6D0\uAC00/]
}

function extractMetricsForBasis(rows: OpenDartAccountRow[], basis: 'CFS' | 'OFS'): Record<FinancialMetricKey, number | null> {
  const basisRows = rows.filter((row) => row.fs_div === basis)

  const findMetric = (metric: FinancialMetricKey): number | null => {
    for (const row of basisRows) {
      const accountName = row.account_nm ?? ''
      if (METRIC_PATTERNS[metric].some((pattern) => pattern.test(accountName))) {
        return chooseAmountField(row)
      }
    }
    return null
  }

  return {
    revenue: findMetric('revenue'),
    operatingIncome: findMetric('operatingIncome'),
    sellingGeneralAdministrativeExpense: findMetric('sellingGeneralAdministrativeExpense'),
    costOfSales: findMetric('costOfSales')
  }
}

function cumulativeToQuarterlyIndependent(
  cumulative: Array<{
    fiscalYear: number
    quarter: 1 | 2 | 3 | 4
    metrics: Record<FinancialMetricKey, number | null>
  }>
): QuarterlyMetricPoint[] {
  const byYear = new Map<number, Map<number, Record<FinancialMetricKey, number | null>>>()

  for (const item of cumulative) {
    if (!byYear.has(item.fiscalYear)) {
      byYear.set(item.fiscalYear, new Map())
    }
    byYear.get(item.fiscalYear)?.set(item.quarter, item.metrics)
  }

  const output: QuarterlyMetricPoint[] = []

  const years = [...byYear.keys()].sort((a, b) => a - b)
  for (const fiscalYear of years) {
    const quarterMap = byYear.get(fiscalYear)
    if (!quarterMap) {
      continue
    }

    const q1 = quarterMap.get(1)
    const q2 = quarterMap.get(2)
    const q3 = quarterMap.get(3)
    const q4 = quarterMap.get(4)

    const toPoint = (
      quarter: 1 | 2 | 3 | 4,
      metrics: Record<FinancialMetricKey, number | null>
    ): QuarterlyMetricPoint => ({
      fiscalYear,
      fiscalQuarter: quarter,
      revenue: metrics.revenue,
      operatingIncome: metrics.operatingIncome,
      sellingGeneralAdministrativeExpense: metrics.sellingGeneralAdministrativeExpense,
      costOfSales: metrics.costOfSales
    })

    if (q1) {
      output.push(toPoint(1, q1))
    }

    if (q2) {
      output.push(
        toPoint(2, {
          revenue: maybeSubtract(q2.revenue, q1?.revenue ?? null),
          operatingIncome: maybeSubtract(q2.operatingIncome, q1?.operatingIncome ?? null),
          sellingGeneralAdministrativeExpense: maybeSubtract(
            q2.sellingGeneralAdministrativeExpense,
            q1?.sellingGeneralAdministrativeExpense ?? null
          ),
          costOfSales: maybeSubtract(q2.costOfSales, q1?.costOfSales ?? null)
        })
      )
    }

    if (q3) {
      output.push(
        toPoint(3, {
          revenue: maybeSubtract(q3.revenue, q2?.revenue ?? null),
          operatingIncome: maybeSubtract(q3.operatingIncome, q2?.operatingIncome ?? null),
          sellingGeneralAdministrativeExpense: maybeSubtract(
            q3.sellingGeneralAdministrativeExpense,
            q2?.sellingGeneralAdministrativeExpense ?? null
          ),
          costOfSales: maybeSubtract(q3.costOfSales, q2?.costOfSales ?? null)
        })
      )
    }

    if (q4) {
      output.push(
        toPoint(4, {
          revenue: maybeSubtract(q4.revenue, q3?.revenue ?? null),
          operatingIncome: maybeSubtract(q4.operatingIncome, q3?.operatingIncome ?? null),
          sellingGeneralAdministrativeExpense: maybeSubtract(
            q4.sellingGeneralAdministrativeExpense,
            q3?.sellingGeneralAdministrativeExpense ?? null
          ),
          costOfSales: maybeSubtract(q4.costOfSales, q3?.costOfSales ?? null)
        })
      )
    }
  }

  return output.sort((a, b) => {
    if (a.fiscalYear !== b.fiscalYear) {
      return a.fiscalYear - b.fiscalYear
    }
    return a.fiscalQuarter - b.fiscalQuarter
  })
}

function metricCoverageCount(points: QuarterlyMetricPoint[]): number {
  let count = 0
  for (const point of points) {
    if (point.revenue !== null) {
      count += 1
    }
    if (point.operatingIncome !== null) {
      count += 1
    }
    if (point.sellingGeneralAdministrativeExpense !== null) {
      count += 1
    }
    if (point.costOfSales !== null) {
      count += 1
    }
  }
  return count
}

export async function fetchAndParseCorpDirectory(apiKey: string): Promise<CompanyDirectoryEntry[]> {
  const response = await fetch(buildOpenDartUrl('corpCode.xml', { crtfc_key: apiKey }))

  if (!response.ok) {
    throw new Error(`Failed to download corpCode zip: ${response.status}`)
  }

  const zipBuffer = await response.arrayBuffer()
  const zip = await JSZip.loadAsync(zipBuffer)

  const xmlEntry = Object.keys(zip.files).find((path) => path.toLowerCase().endsWith('.xml'))
  if (!xmlEntry) {
    throw new Error('corpCode zip did not include xml file')
  }

  const xmlContent = await zip.file(xmlEntry)?.async('text')
  if (!xmlContent) {
    throw new Error('Failed to read corpCode xml content')
  }

  const parser = new XMLParser({
    ignoreAttributes: true,
    trimValues: true
  })

  const parsed = parser.parse(xmlContent) as {
    result?: {
      list?: Array<{
        corp_code?: string
        corp_name?: string
        corp_eng_name?: string
        stock_code?: string
        modify_date?: string
      }>
    }
  }

  const rawList = parsed.result?.list ?? []
  return rawList
    .map((entry) =>
      CompanyDirectoryEntrySchema.parse({
        corpCode: entry.corp_code ?? '',
        corpName: entry.corp_name ?? '',
        corpEngName: entry.corp_eng_name || undefined,
        stockCode: entry.stock_code || undefined,
        modifyDate: entry.modify_date || undefined
      })
    )
    .filter((entry) => entry.corpCode && entry.corpName)
}

export async function fetchLatestPeriodicDisclosure(
  apiKey: string,
  corpCode: string,
  lastCheckedAtIso?: string
): Promise<PeriodicDisclosureSummary | null> {
  const now = new Date()
  const defaultBegin = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  defaultBegin.setUTCDate(defaultBegin.getUTCDate() - 120)

  let beginDate = formatDateYYYYMMDD(defaultBegin)
  if (lastCheckedAtIso) {
    const parsed = new Date(lastCheckedAtIso)
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setUTCDate(parsed.getUTCDate() - 1)
      beginDate = formatDateYYYYMMDD(parsed)
    }
  }

  const result = await fetchOpenDartJson<{
    rcept_no?: string
    rcept_dt?: string
  }>('list.json', {
    crtfc_key: apiKey,
    corp_code: corpCode,
    bgn_de: beginDate,
    end_de: formatDateYYYYMMDD(now),
    pblntf_ty: 'A',
    last_reprt_at: 'Y',
    sort: 'date',
    sort_mth: 'desc',
    page_no: '1',
    page_count: '1'
  })

  if (result.status !== '000') {
    if (result.status === '013') {
      return null
    }
    throw new Error(`OpenDART disclosure list error ${result.status}: ${result.message}`)
  }

  const entry = result.list?.[0]
  if (!entry?.rcept_no || !entry.rcept_dt) {
    return null
  }

  return {
    rceptNo: entry.rcept_no,
    rceptDate: entry.rcept_dt
  }
}

export async function fetchNormalizedFinancials(
  apiKey: string,
  corpCode: string,
  startYear: number,
  endYear: number
): Promise<NormalizedFinancialResult> {
  const cumulativeByBasis: Record<'CFS' | 'OFS', Array<{ fiscalYear: number; quarter: 1 | 2 | 3 | 4; metrics: Record<FinancialMetricKey, number | null> }>> = {
    CFS: [],
    OFS: []
  }

  for (let year = startYear; year <= endYear; year += 1) {
    for (const report of REPORT_CODES) {
      const response = await fetchOpenDartJson<OpenDartAccountRow>('fnlttSinglAcnt.json', {
        crtfc_key: apiKey,
        corp_code: corpCode,
        bsns_year: String(year),
        reprt_code: report.reportCode
      })

      if (response.status !== '000') {
        if (response.status === '013') {
          continue
        }
        throw new Error(
          `OpenDART financial request failed for ${formatYearAndQuarterLabel(year, report.quarter)}: ${response.status} ${response.message}`
        )
      }

      const rows = response.list ?? []
      const cfsMetrics = extractMetricsForBasis(rows, 'CFS')
      const ofsMetrics = extractMetricsForBasis(rows, 'OFS')

      const hasAnyCfs = Object.values(cfsMetrics).some((value) => value !== null)
      const hasAnyOfs = Object.values(ofsMetrics).some((value) => value !== null)

      if (hasAnyCfs) {
        cumulativeByBasis.CFS.push({
          fiscalYear: year,
          quarter: report.quarter,
          metrics: cfsMetrics
        })
      }

      if (hasAnyOfs) {
        cumulativeByBasis.OFS.push({
          fiscalYear: year,
          quarter: report.quarter,
          metrics: ofsMetrics
        })
      }
    }
  }

  const cfsPoints = cumulativeToQuarterlyIndependent(cumulativeByBasis.CFS)
  const ofsPoints = cumulativeToQuarterlyIndependent(cumulativeByBasis.OFS)

  const selectedBasis = cfsPoints.length > 0 && metricCoverageCount(cfsPoints) > 0 ? 'CFS' : 'OFS'

  return {
    pointsByBasis: {
      CFS: cfsPoints,
      OFS: ofsPoints
    },
    selectedBasis
  }
}
