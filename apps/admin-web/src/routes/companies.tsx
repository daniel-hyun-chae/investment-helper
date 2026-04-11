import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { searchCompanies, type SearchCompanyItem } from '../lib/api'
import { t } from '../lib/i18n'

export const Route = createFileRoute('/companies')({
  component: CompaniesRoute
})

function CompaniesRoute() {
  const messages = useMemo(() => t(), [])
  const navigate = useNavigate({ from: '/companies' })
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<SearchCompanyItem[]>([])

  async function onSearch(nextQuery: string): Promise<void> {
    setQuery(nextQuery)
    if (!nextQuery.trim()) {
      setItems([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await searchCompanies(nextQuery)
      setItems(data)
    } catch {
      setError(messages.fetchError)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="companies-page">
      <header className="companies-header">
        <h1>{messages.appTitle}</h1>
        <p>{messages.appSubtitle}</p>
      </header>

      <section className="search-panel">
        <label htmlFor="company-search-input">{messages.searchLabel}</label>
        <input
          id="company-search-input"
          type="search"
          value={query}
          placeholder={messages.searchPlaceholder}
          onChange={(event) => {
            void onSearch(event.target.value)
          }}
        />
      </section>

      {loading ? <p>{messages.loading}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && query.trim() && items.length === 0 ? <p>{messages.searchEmpty}</p> : null}

      <ul className="company-result-list">
        {items.map((item) => (
          <li key={item.corp_code}>
            <button
              type="button"
              onClick={() => {
                void navigate({
                  to: '/companies/$corpCode/summary',
                  params: { corpCode: item.corp_code }
                })
              }}
            >
              <strong>{item.corp_name}</strong>
              <span>{item.stock_code ? `${item.stock_code} / ${item.corp_code}` : item.corp_code}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
