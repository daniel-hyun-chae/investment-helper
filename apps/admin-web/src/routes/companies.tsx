import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  getCompanySyncStatus,
  searchCompanies,
  syncCompanies,
  type SearchCompanyItem
} from '../lib/api'
import { t } from '../lib/i18n'

export const Route = createFileRoute('/companies')({
  component: CompaniesRoute
})

function CompaniesRoute() {
  const messages = useMemo(() => t(), [])
  const navigate = useNavigate({ from: '/companies' })
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [items, setItems] = useState<SearchCompanyItem[]>([])
  const [synced, setSynced] = useState<boolean | null>(null)
  const [syncedCount, setSyncedCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadStatus(): Promise<void> {
      try {
        const status = await getCompanySyncStatus()
        if (!cancelled) {
          setSynced(status.synced)
          setSyncedCount(status.count)
        }
      } catch {
        if (!cancelled) {
          setSynced(false)
        }
      }
    }

    void loadStatus()

    return () => {
      cancelled = true
    }
  }, [])

  async function onSync(): Promise<void> {
    setSyncing(true)
    setError(null)
    setNotice(null)
    try {
      const count = await syncCompanies()
      setSynced(true)
      setSyncedCount(count)
      setNotice(messages.searchSyncDone)
      if (query.trim()) {
        const data = await searchCompanies(query)
        setItems(data)
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'OPENDART_SERVICE_UNAVAILABLE' || error.code === 'OPENDART_RATE_LIMITED') {
          setError(`${messages.syncServiceUnavailable} (${error.message})`)
          return
        }

        const hint = error.code === 'API_ENDPOINT_NOT_FOUND' ? ` ${messages.apiTargetHint}` : ''
        setError(`${messages.searchSyncFailed} (${error.message})${hint}`)
      } else {
        setError(messages.searchSyncFailed)
      }
    } finally {
      setSyncing(false)
    }
  }

  async function onSearch(nextQuery: string): Promise<void> {
    setQuery(nextQuery)
    if (!nextQuery.trim()) {
      setItems([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      if (nextQuery.trim().length < 2) {
        setItems([])
        return
      }
      const data = await searchCompanies(nextQuery)
      setItems(data)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'DIRECTORY_NOT_SYNCED') {
        setSynced(false)
        setError(messages.searchSyncRequired)
      } else {
        const hint = error instanceof ApiError && error.code === 'API_ENDPOINT_NOT_FOUND'
          ? ` ${messages.apiTargetHint}`
          : ''
        setError(error instanceof ApiError ? `${error.message}${hint}` : messages.fetchError)
      }
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
        <div className="sync-controls">
          <button type="button" onClick={() => void onSync()} disabled={syncing}>
            {syncing ? messages.syncing : messages.syncButton}
          </button>
          {synced !== null ? (
            <span>
              {messages.syncedCountPrefix}: {syncedCount}
            </span>
          ) : null}
        </div>
      </section>

      {loading ? <p>{messages.loading}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {notice ? <p>{notice}</p> : null}

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

      <Outlet />
    </main>
  )
}
