# Company Summary Spec

## Scope

Company search and summary trend visualization backed by OpenDART data with local caching.

## Behaviors

- Users can search companies by Korean name (fuzzy match) from the local company directory.
- The local company directory is sourced from OpenDART corpCode data and reused across users.
- Company search requires explicit directory sync and returns a sync-required response when directory data is missing.
- Directory sync failures return actionable error payloads (code + detail) so UI can display clear remediation guidance.
- Temporary OpenDART outage/rate-limit conditions are surfaced as retryable sync errors and are retried with short backoff before failure is returned.
- Summary refresh-check failures from OpenDART list API do not hard-fail summary responses; cached summary data is returned with a refresh warning payload.
- Summary refresh and basis selection are optimized to stay within Worker subrequest/CPU limits by scoping refresh windows and avoiding redundant basis-count queries.
- Company directory sync performs full import in batches (no pre-populated-cache skip) so expected listed companies remain searchable.
- Summary aggregation tolerates partial quarterly nulls by summing available values, reducing empty-chart outcomes for partially disclosed metrics.
- When OpenDART is temporarily unavailable but a local company directory cache already exists, sync returns success with a warning and keeps existing cached directory data available.
- Opening a company summary returns cached trend data when available.
- If cached trend data is missing, the system fetches from OpenDART, normalizes, stores, then returns results.
- The system performs incremental refresh checks for newer periodic disclosures and refreshes cache only when needed.
- Summary trends support yearly, quarterly, and last four quarters (TTM) views.
- Summary trends support range filters for the latest 5 years or 10 years.
- Trend metrics include revenue, operating income, selling and administrative expense, and cost of sales in one chart.
- Financial basis uses CFS first and falls back to OFS when CFS is unavailable.
- UI labels are Korean-first and organized in a translation-ready message structure.
- The summary response includes a market-cap availability contract that is extensible for a future right-axis source.
- Local development supports deterministic fixture seeding endpoints for realistic e2e checks without external API dependency.
- Local development supports deterministic manual directory sync mode for e2e checks without external OpenDART dependency.
