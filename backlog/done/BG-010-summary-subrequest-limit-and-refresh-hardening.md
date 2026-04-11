# BG-010 - Fix summary subrequest limit and refresh-check redirect failures

Priority: P0
Status: In Progress
Theme: Runtime reliability
Spec: spec/company-summary.md, spec/ingestion.md, spec/README.md

## Why now

Summary requests are failing in production with Worker subrequest-limit exceptions and OpenDART list API redirect loops. The summary endpoint must avoid excessive upstream calls and avoid hard failures when refresh checks are blocked.

## What changes

- Limit on-demand summary financial refresh window to requested range years instead of always fetching full 10+ years.
- Skip OpenDART disclosure refresh-check call when there is no cached financial data (directly perform initial refresh path).
- Reduce summary request DB subrequests by removing redundant preferred-basis count query and using in-query fallback logic.
- Keep summary response available from cache while carrying refresh warning metadata.

## Acceptance criteria

- Summary endpoint no longer fails with `Too many subrequests` for first-load yearly/range requests.
- Summary endpoint no longer hard-fails due refresh-check redirect loops on list API.
- Existing tests/validation pass.

## Out of scope

- Background queue-based financial refresh orchestration.

## Dependencies / Related

- BG-009 batching changes.

## Implementation Plan

1. Optimize summary refresh path and subrequest usage in worker.
2. Keep warning-based refresh-check degradation behavior.
3. Run validation and update docs/backlog.

## Task List

- [x] Optimize summary refresh and basis selection query flow.
- [x] Ensure refresh-check call is skipped on cold cache and warning behavior remains.
- [x] Run validation and update backlog state.

## Implementation Notes

- 2026-04-11: Started after production logs showed subrequest limit failure and list API redirect loops during summary requests.
- 2026-04-11: `shouldRefreshCompanyFinancials` now skips OpenDART list refresh-check on cold cache, preventing unnecessary upstream calls before initial financial fetch.
- 2026-04-11: Removed redundant `determineSelectedBasis` query and replaced with in-line fallback query only when selected basis has no rows.
- 2026-04-11: Financial refresh window now uses requested summary range/period (`yearsWindowForSummary`) instead of fixed 10-year fetch.
- 2026-04-11: Added guarded OpenDART JSON fetch path with manual redirect handling and timeout/retry protection to eliminate unhandled `Too many redirects` failures.
- 2026-04-11: Extended real-dart e2e to assert absence of subrequest/CPU/redirect failure text in summary flow.

## Tests

- `pnpm install --frozen-lockfile` (pass)
- `pnpm -r --if-present lint` (pass)
- `pnpm -r --if-present typecheck` (pass)
- `pnpm -r --if-present test` (pass; no unit test files)
- `pnpm -r --if-present build` (pass)
- `pnpm -C apps/bot-worker deploy:check` (pass)
- Real-dart e2e remains dependent on deployed worker rollout; updated tests are ready and include direct summary open assertion.
