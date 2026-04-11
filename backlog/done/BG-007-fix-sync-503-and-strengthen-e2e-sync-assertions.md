# BG-007 - Fix company directory sync 503 handling and strengthen e2e sync assertions

Priority: P0
Status: Done
Theme: Reliability
Spec: spec/company-summary.md, spec/ingestion.md

## Why now

Users hit 503-style sync failures in admin flow, and previous e2e coverage did not reliably catch real sync-success regressions because assertions were too weak.

## What changes

- Improved `/api/companies/sync` behavior for transient OpenDART outages by reusing existing directory cache when available.
- Added deterministic local sync mode for development/e2e so manual sync success can be asserted without external API dependency.
- Strengthened e2e sync assertions to verify actual sync outcome rather than generic UI text presence.

## Acceptance criteria

- Manual sync no longer hard-fails when OpenDART is temporarily unavailable and cached directory data already exists.
- Local e2e manual sync scenario verifies real success outcome deterministically.
- `pnpm e2e:local:stack` passes with strengthened assertions.

## Out of scope

- Replacing OpenDART as the primary company directory source.
- Changing production infrastructure location/provider.

## Dependencies / Related

- Builds on BG-005 and BG-006 sync/e2e reliability work.

## Implementation Plan

1. Update worker sync handling with cached-directory fallback and deterministic local sync mode.
2. Update local env generation and UI handling for sync outcome metadata.
3. Strengthen e2e tests to assert concrete sync result.
4. Run full validation including local e2e stack.

## Task List

- [x] Update worker sync path and fallback behavior.
- [x] Update local env and UI sync messaging.
- [x] Strengthen Playwright sync tests.
- [x] Run validation and record results.
- [x] Move item to done and update backlog table.

## Implementation Notes

- Worker `syncCompanyDirectory` now returns cached-directory fallback success when OpenDART returns transient outage codes (`OPENDART_SERVICE_UNAVAILABLE`, `OPENDART_RATE_LIMITED`) and `company_directory` already has data.
- Added `LOCAL_SYNC_MODE` env handling for local development. When enabled with local fixture gating, `POST /api/companies/sync` performs deterministic local directory upsert (`NAVER`, `KAKAO`) instead of external OpenDART sync.
- Admin API layer now returns structured sync metadata (`syncSkipped`, `warningCode`, `warningMessage`, `localMode`) and companies UI reflects warning-based success notice.
- Local env generator now writes `LOCAL_SYNC_MODE=1` into worker `.dev.vars` for deterministic local e2e runs.
- Strengthened e2e manual sync assertion to require actual company search result visibility and to assert absence of sync failure message.

## Tests

- `pnpm -r --if-present typecheck` (pass)
- `pnpm e2e:local:stack` (pass)
- `pnpm install --frozen-lockfile` (pass)
- `pnpm -r --if-present lint` (pass)
- `pnpm -r --if-present test` (pass)
- `pnpm -r --if-present build` (pass)
- `pnpm e2e:local:stack` (pass, 4/4 tests)
