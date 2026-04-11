import {
  createFileRoute,
  useNavigate,
  useParams
} from '@tanstack/react-router'
import type { SummaryPeriod, SummaryRange } from '@investment-helper/contracts'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { fetchCompanySummary } from '../lib/api'
import { t } from '../lib/i18n'

type SummaryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready'
      data: Awaited<ReturnType<typeof fetchCompanySummary>>
    }
  | { status: 'error'; message: string }

const PERIODS: SummaryPeriod[] = ['yearly', 'quarterly', 'ttm']
const RANGES: SummaryRange[] = ['5', '10']

const COLORS = {
  revenue: '#2d6cdf',
  operatingIncome: '#16a34a',
  sga: '#f59e0b',
  costOfSales: '#ef4444'
} as const

export const Route = createFileRoute('/companies/$corpCode/summary')({
  component: CompanySummaryRoute
})

function buildSeriesValues(values: Array<number | null>): { min: number; max: number } {
  const filtered = values.filter((value): value is number => value !== null)
  if (filtered.length === 0) {
    return { min: -1, max: 1 }
  }
  const min = Math.min(...filtered)
  const max = Math.max(...filtered)
  if (min === max) {
    return { min: min - 1, max: max + 1 }
  }
  return { min, max }
}

function toPath(values: Array<number | null>, width: number, height: number, min: number, max: number): string {
  if (values.length === 0) {
    return ''
  }

  const dx = values.length > 1 ? width / (values.length - 1) : 0

  const points = values.map((value, index) => {
    const x = index * dx
    if (value === null) {
      return null
    }

    const ratio = (value - min) / (max - min || 1)
    const y = height - ratio * height
    return { x, y }
  })

  let path = ''
  for (const point of points) {
    if (!point) {
      continue
    }
    path += path ? ` L ${point.x.toFixed(2)} ${point.y.toFixed(2)}` : `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  }
  return path
}

function CompanySummaryRoute() {
  const messages = useMemo(() => t(), [])
  const navigate = useNavigate({ from: '/companies/$corpCode/summary' })
  const { corpCode } = useParams({ from: '/companies/$corpCode/summary' })
  const [period, setPeriod] = useState<SummaryPeriod>('yearly')
  const [range, setRange] = useState<SummaryRange>('5')
  const [state, setState] = useState<SummaryState>({ status: 'idle' })

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      setState({ status: 'loading' })
      try {
        const data = await fetchCompanySummary(corpCode, period, range)
        if (!cancelled) {
          setState({ status: 'ready', data })
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'error', message: messages.fetchError })
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [corpCode, period, range, messages.fetchError])

  const points = state.status === 'ready' ? state.data.points : []
  const labels = points.map((point) => point.label)

  const series = {
    revenue: points.map((point) => point.revenue),
    operatingIncome: points.map((point) => point.operatingIncome),
    sga: points.map((point) => point.sellingGeneralAdministrativeExpense),
    costOfSales: points.map((point) => point.costOfSales)
  }

  const domain = buildSeriesValues([
    ...series.revenue,
    ...series.operatingIncome,
    ...series.sga,
    ...series.costOfSales
  ])

  const chartWidth = 760
  const chartHeight = 300

  return (
    <main className="summary-page">
      <button
        className="back-button"
        type="button"
        onClick={() => {
          void navigate({ to: '/companies' })
        }}
      >
        {'<-'} {messages.searchLabel}
      </button>

      <header className="summary-header">
        <h1>{state.status === 'ready' ? state.data.corpName : corpCode}</h1>
        <p>{messages.summaryHeading}</p>
      </header>

      <section className="summary-controls" aria-label="summary-controls">
        <div className="control-group">
          <span>{messages.controls.period}</span>
          <div>
            {PERIODS.map((option) => (
              <button
                key={option}
                type="button"
                className={period === option ? 'active' : ''}
                onClick={() => {
                  setPeriod(option)
                }}
              >
                {option === 'yearly'
                  ? messages.controls.yearly
                  : option === 'quarterly'
                    ? messages.controls.quarterly
                    : messages.controls.ttm}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <span>{messages.controls.range}</span>
          <div>
            {RANGES.map((option) => (
              <button
                key={option}
                type="button"
                className={range === option ? 'active' : ''}
                onClick={() => {
                  setRange(option)
                }}
              >
                {option === '5' ? messages.controls.years5 : messages.controls.years10}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="summary-meta">
        <p>
          {messages.basisLabel}: <strong>{state.status === 'ready' ? state.data.basis : '-'}</strong>
        </p>
        <p>{messages.marketCapNotice}</p>
      </section>

      {state.status === 'loading' ? <p>{messages.loading}</p> : null}
      {state.status === 'error' ? <p className="error-text">{state.message}</p> : null}

      {state.status === 'ready' ? (
        <section className="chart-card">
          <div className="legend">
            <span style={{ '--legend-color': COLORS.revenue } as CSSProperties}>
              {messages.metrics.revenue}
            </span>
            <span style={{ '--legend-color': COLORS.operatingIncome } as CSSProperties}>
              {messages.metrics.operatingIncome}
            </span>
            <span style={{ '--legend-color': COLORS.sga } as CSSProperties}>
              {messages.metrics.sga}
            </span>
            <span style={{ '--legend-color': COLORS.costOfSales } as CSSProperties}>
              {messages.metrics.costOfSales}
            </span>
          </div>

          <div className="chart-scroll-wrapper">
            <svg
              className="summary-chart"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="summary trend chart"
            >
              <path d={toPath(series.revenue, chartWidth, chartHeight, domain.min, domain.max)} stroke={COLORS.revenue} fill="none" strokeWidth="2" />
              <path
                d={toPath(series.operatingIncome, chartWidth, chartHeight, domain.min, domain.max)}
                stroke={COLORS.operatingIncome}
                fill="none"
                strokeWidth="2"
              />
              <path
                d={toPath(series.sga, chartWidth, chartHeight, domain.min, domain.max)}
                stroke={COLORS.sga}
                fill="none"
                strokeWidth="2"
              />
              <path
                d={toPath(series.costOfSales, chartWidth, chartHeight, domain.min, domain.max)}
                stroke={COLORS.costOfSales}
                fill="none"
                strokeWidth="2"
              />
            </svg>
          </div>

          <div className="x-axis-labels">
            {labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
