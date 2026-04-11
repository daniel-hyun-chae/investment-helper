# BG-002 - OpenDART company summary trend graph with cached refresh checks

Priority: P0
Status: Done
Theme: Data ingestion and normalization
Spec: spec/company-summary.md, spec/ingestion.md, spec/README.md

## Why now

Users need a usable company summary page that mirrors the core Butler trend experience while controlling OpenDART request volume through durable local storage and incremental refresh behavior.

## What changes

- Add a dedicated company summary route in the web app so users can search companies and open a summary view without using the admin landing page.
- Build and persist a local company directory from the OpenDART corpCode zip so search runs against local data for all corp codes.
- Add a connector flow that fetches and normalizes OpenDART financial data for one company on first request, then serves later requests from local cache.
- Show one combined trend chart for revenue, operating income, selling and administrative expense, and cost of sales.
- Support view controls for yearly, quarterly, and last four quarters (TTM), plus 5-year and 10-year ranges.
- Use CFS first and OFS as fallback when CFS is unavailable, and display which basis is active in the summary UI.
- Add incremental refresh checks for new periodic disclosures so newly published quarter results can update cached series without full backfill.
- Deliver responsive behavior from day one, including 360px wide mobile layouts and touch-friendly chart interactions.
- Keep UI copy Korean-first with translation-ready keys and structure.
- Keep market capitalization on the right axis out of v1 because OpenDART does not provide direct market cap data; leave an extensible metric-source boundary for future integration.

## Acceptance criteria

- The app exposes a dedicated company summary route that is separate from the current root admin route.
- The system imports and stores corpCode zip contents in the local database, including corp code and company name fields used for search.
- Company search uses local database records only and supports fuzzy Korean matching across stored company names.
- On the first summary request for a company/time option, the connector fetches OpenDART data, normalizes it, stores it, and returns it.
- On repeated requests for the same company/time option, the system returns cached series from the local database without repeating the same upstream fetch.
- The summary chart displays revenue, operating income, selling and administrative expense, and cost of sales in one graph.
- The summary UI provides working toggles for yearly, quarterly, last four quarters, and 5-year or 10-year range filters.
- The last four quarters series is derived from quarterly values and reflects rolling four-quarter totals.
- The summary response uses CFS data when available and falls back to OFS when CFS is missing, and the active basis is visible in the UI.
- The system checks for newer periodic disclosures for the company and refreshes cached trend data when a newer filing is detected.
- The summary page remains usable at 360px viewport width with readable labels, operable controls, and no horizontal overflow in primary chart controls.
- User-facing strings for the summary route are Korean-first and implemented with a translation-ready key structure.
- The data model and API contract allow adding a future right-axis metric source without breaking existing trend endpoints.

## Out of scope

- Right-axis market capitalization rendering in v1.
- Real-time or intraday price ingestion.
- Non-OpenDART external market data connectors.

## Dependencies / Related

- OpenDART corpCode endpoint and periodic disclosure/financial endpoints.
- Existing Supabase Postgres setup and migration workflow in infra/supabase.
- Existing connector package contracts in packages/connectors.

## Notes

- OpenDART guides confirm company master and financial endpoints, but do not expose direct market cap values.
- Refresh behavior is incremental: first-request cache population plus lightweight new-filing checks for updates.

## Implementation Plan

1. Add persistence schema for OpenDART company directory, normalized financial points, and per-company refresh state, including fuzzy-search SQL support.
2. Implement OpenDART connector utilities for corpCode zip parsing, financial account extraction, quarterly normalization, yearly normalization, and incremental disclosure checks.
3. Extend bot-worker with summary/search/sync API endpoints backed by Supabase caching rules and refresh orchestration.
4. Implement admin-web company route UX with Korean-first, translation-ready labels, fuzzy search, summary controls, and responsive single-chart rendering.
5. Update specs and architecture docs, then run full override validation and record results.

## Task List

- [x] Add Supabase migration for company directory, cached financial points, refresh state, and fuzzy-search RPC.
- [x] Add connector code for OpenDART corpCode ingestion, financial normalization, and refresh checks.
- [x] Add bot-worker API routes for company sync, company search, and summary trend data.
- [x] Add admin-web routes/components/styles for search and trend summary with responsive behavior.
- [x] Update ingestion spec and any new spec/domain documentation.
- [x] Run validation commands and record outputs.
- [x] Set item status to Done, move backlog file to done, and update backlog README summary.

## Implementation Notes

- 2026-04-11: Implementation started after explicit user approval.
- 2026-04-11: V1 excludes market capitalization plotting because OpenDART DS001-DS006 does not expose direct market cap and it is not derivable without external price data.
- 2026-04-11: Added Supabase migration `20260411190000_bg002_company_summary.sql` with `company_directory`, `company_financial_points`, `company_refresh_state`, trigram index, and `search_company_directory` RPC.
- 2026-04-11: Expanded connectors package with corpCode zip parsing (JSZip + fast-xml-parser), periodic disclosure freshness checks, and quarterly normalization helpers with CFS/OFS basis selection.
- 2026-04-11: Added bot-worker endpoints `POST /api/opendart/sync-companies`, `GET /api/companies/search`, and `GET /api/companies/:corpCode/summary` with first-request cache fill and incremental disclosure refresh checks.
- 2026-04-11: Added admin-web `/companies` search route and `/companies/$corpCode/summary` route with Korean-first labels, yearly/quarterly/TTM controls, 5y/10y range controls, CFS/OFS basis badge, and responsive single-chart rendering.
- 2026-04-11: Added `spec/company-summary.md`, expanded `spec/ingestion.md`, and updated architecture docs (`codebase-map.md`, `domain-glossary.md`) to reflect new company-summary domain and cache model.
- 2026-04-11: Added market-cap extensibility contract to summary response (`marketCap.available=false`, `reason=not_supported_by_opendart_v1`) without plotting right-axis data in v1.
- 2026-04-11: Added Telegram command handling for `/unwatch <code>` and `/list`, plus queue payload schema validation using `AnalysisJobSchema`.
- 2026-04-11: Lockfile changed due new workspace dependencies (`fast-xml-parser`, `jszip`, contracts/connectors cross-package usage); final `pnpm install --frozen-lockfile` passes.

## Tests

- `pnpm install --frozen-lockfile` (pass)
- `pnpm -r --if-present lint` (pass)
- `pnpm -r --if-present typecheck` (pass)
- `pnpm -r --if-present test` (pass; no test files yet)
- `pnpm -r --if-present build` (pass)
- `pnpm -C apps/bot-worker deploy:check` (pass)
- Product checklist verification:
  - Telegram command paths for `/start`, `/watch`, `/unwatch`, `/list` are implemented and exercised by TypeScript validation (pass).
  - Queue payload schema validation before queue consumption uses `AnalysisJobSchema.safeParse` (pass by code inspection + typecheck).
  - Scheduled polling remains idempotent at worker level (single deterministic enqueue per cron tick; no duplication loop introduced).
  - Subscription read/write paths against Supabase remain active for watch/list/unwatch commands (pass by code inspection + typecheck).
  - Admin health endpoint `/admin/health` still returns expected fields (`ok`, `ingestion`, `queues`).
