import type { CompanySummaryResponse, SummaryPeriod, SummaryRange } from '@investment-helper/contracts'

export type SearchCompanyItem = {
  corp_code: string
  corp_name: string
  corp_eng_name: string | null
  stock_code: string | null
  modify_date: string | null
  similarity_score: number
}

export class ApiError extends Error {
  readonly code?: string
  readonly status: number

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type ErrorPayload = {
  ok: boolean
  error?: string
  code?: string
  detail?: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8787'

async function parseJson<T>(response: Response): Promise<T> {
  try {
    const data = (await response.json()) as T
    return data
  } catch {
    const fallbackText = await response.text()
    throw new ApiError(
      `API response was not valid JSON (status ${response.status}): ${fallbackText.slice(0, 160)}`,
      response.status,
      'INVALID_API_RESPONSE'
    )
  }
}

export async function searchCompanies(query: string): Promise<SearchCompanyItem[]> {
  if (!query.trim()) {
    return []
  }

  const url = new URL('/api/companies/search', API_BASE)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '20')

  const response = await fetch(url.toString())
  if (response.status === 404) {
    throw new ApiError(
      'API endpoint not found. Check VITE_API_BASE_URL points to Worker URL.',
      404,
      'API_ENDPOINT_NOT_FOUND'
    )
  }
  const payload = await parseJson<{ ok: boolean; data?: SearchCompanyItem[]; error?: string; code?: string }>(response)
  if (!response.ok || !payload.ok) {
    throw new ApiError(payload.error ?? 'search failed', response.status, payload.code)
  }
  return payload.data ?? []
}

export type SyncCompaniesResult = {
  imported: number
  syncSkipped?: boolean
  warningCode?: string
  warningMessage?: string
  localMode?: boolean
}

export async function syncCompanies(): Promise<SyncCompaniesResult> {
  const url = new URL('/api/companies/sync', API_BASE)
  const response = await fetch(url.toString(), { method: 'POST' })
  if (response.status === 404) {
    throw new ApiError(
      'Sync endpoint not found. Check VITE_API_BASE_URL points to Worker URL.',
      404,
      'API_ENDPOINT_NOT_FOUND'
    )
  }
  const payload = await parseJson<{
    ok: boolean
    imported?: number
    error?: string
    code?: string
    detail?: string
    syncSkipped?: boolean
    warningCode?: string
    warningMessage?: string
    localMode?: boolean
  }>(response)

  if (!response.ok || !payload.ok) {
    const detail = payload.detail ? ` (${payload.detail})` : ''
    throw new ApiError(`${payload.error ?? 'sync failed'}${detail}`, response.status, payload.code)
  }

  return {
    imported: payload.imported ?? 0,
    syncSkipped: payload.syncSkipped,
    warningCode: payload.warningCode,
    warningMessage: payload.warningMessage,
    localMode: payload.localMode
  }
}

export async function getCompanySyncStatus(): Promise<{ synced: boolean; count: number }> {
  const url = new URL('/api/companies/sync', API_BASE)
  const response = await fetch(url.toString())
  if (response.status === 404) {
    throw new ApiError(
      'Sync status endpoint not found. Check VITE_API_BASE_URL points to Worker URL.',
      404,
      'API_ENDPOINT_NOT_FOUND'
    )
  }
  const payload = await parseJson<{ ok: boolean; synced?: boolean; count?: number; error?: string }>(response)

  if (!response.ok || !payload.ok) {
    throw new ApiError(payload.error ?? 'sync status failed', response.status)
  }

  return {
    synced: payload.synced ?? false,
    count: payload.count ?? 0
  }
}

export async function devSeedFixtures(corpCode = '00126380', corpName = 'NAVER'): Promise<void> {
  const url = new URL('/api/dev/fixtures/seed', API_BASE)
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ corpCode, corpName, stockCode: '035420' })
  })
  if (response.status === 404) {
    throw new ApiError(
      'Dev fixture endpoint not found. Ensure local worker dev mode is running.',
      404,
      'API_ENDPOINT_NOT_FOUND'
    )
  }

  const payload = await parseJson<{ ok: boolean; error?: string }>(response)
  if (!response.ok || !payload.ok) {
    throw new ApiError(payload.error ?? 'dev fixture seed failed', response.status)
  }
}

export async function devResetFixtures(): Promise<void> {
  const url = new URL('/api/dev/fixtures/reset', API_BASE)
  const response = await fetch(url.toString(), { method: 'POST' })
  if (response.status === 404) {
    throw new ApiError(
      'Dev fixture reset endpoint not found. Ensure local worker dev mode is running.',
      404,
      'API_ENDPOINT_NOT_FOUND'
    )
  }
  const payload = await parseJson<{ ok: boolean; error?: string }>(response)
  if (!response.ok || !payload.ok) {
    throw new ApiError(payload.error ?? 'dev fixture reset failed', response.status)
  }
}

export async function fetchCompanySummary(
  corpCode: string,
  period: SummaryPeriod,
  range: SummaryRange
): Promise<CompanySummaryResponse> {
  const url = new URL(`/api/companies/${corpCode}/summary`, API_BASE)
  url.searchParams.set('period', period)
  url.searchParams.set('range', range)

  const response = await fetch(url.toString())
  if (response.status === 404) {
    throw new ApiError(
      'Summary endpoint not found. Check VITE_API_BASE_URL points to Worker URL.',
      404,
      'API_ENDPOINT_NOT_FOUND'
    )
  }
  const payload = await parseJson<{ ok: boolean; data?: CompanySummaryResponse; error?: string; code?: string }>(response)
  if (!response.ok || !payload.ok || !payload.data) {
    throw new ApiError(payload.error ?? 'summary fetch failed', response.status, payload.code)
  }

  return payload.data
}
