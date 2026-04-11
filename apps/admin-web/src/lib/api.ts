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

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8787'

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T
  return data
}

export async function searchCompanies(query: string): Promise<SearchCompanyItem[]> {
  if (!query.trim()) {
    return []
  }

  const url = new URL('/api/companies/search', API_BASE)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '20')

  const response = await fetch(url.toString())
  const payload = await parseJson<{ ok: boolean; data?: SearchCompanyItem[]; error?: string; code?: string }>(response)
  if (!response.ok || !payload.ok) {
    throw new ApiError(payload.error ?? 'search failed', response.status, payload.code)
  }
  return payload.data ?? []
}

export async function syncCompanies(): Promise<number> {
  const url = new URL('/api/companies/sync', API_BASE)
  const response = await fetch(url.toString(), { method: 'POST' })
  const payload = await parseJson<{ ok: boolean; imported?: number; error?: string }>(response)

  if (!response.ok || !payload.ok) {
    throw new ApiError(payload.error ?? 'sync failed', response.status)
  }

  return payload.imported ?? 0
}

export async function getCompanySyncStatus(): Promise<{ synced: boolean; count: number }> {
  const url = new URL('/api/companies/sync', API_BASE)
  const response = await fetch(url.toString())
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

  const payload = await parseJson<{ ok: boolean; error?: string }>(response)
  if (!response.ok || !payload.ok) {
    throw new ApiError(payload.error ?? 'dev fixture seed failed', response.status)
  }
}

export async function devResetFixtures(): Promise<void> {
  const url = new URL('/api/dev/fixtures/reset', API_BASE)
  const response = await fetch(url.toString(), { method: 'POST' })
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
  const payload = await parseJson<{ ok: boolean; data?: CompanySummaryResponse; error?: string }>(response)
  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? 'summary fetch failed')
  }

  return payload.data
}
