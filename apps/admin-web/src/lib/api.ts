import type { CompanySummaryResponse, SummaryPeriod, SummaryRange } from '@investment-helper/contracts'

export type SearchCompanyItem = {
  corp_code: string
  corp_name: string
  corp_eng_name: string | null
  stock_code: string | null
  modify_date: string | null
  similarity_score: number
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
  const payload = await parseJson<{ ok: boolean; data?: SearchCompanyItem[]; error?: string }>(response)
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? 'search failed')
  }
  return payload.data ?? []
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
