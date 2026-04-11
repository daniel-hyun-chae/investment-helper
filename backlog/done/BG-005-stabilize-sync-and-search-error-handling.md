# BG-005 - Stabilize company sync and search error handling with deterministic local sync mode

Priority: P0
Status: Done
Theme: Reliability and developer experience
Spec: spec/company-summary.md, spec/ingestion.md, spec/README.md

## Why now

Users are blocked by generic sync/search failures (`데이터를 불러오지 못했습니다.`) with limited diagnostics. The sync path needs robust upstream error handling and deterministic local behavior for stable e2e verification.

## What changes

- Improve OpenDART corpCode sync parsing and error reporting when non-zip responses are returned.
- Return structured sync failure payloads from worker APIs.
- Surface actionable sync/search error messages in admin-web instead of generic fetch errors.
- Add deterministic local sync mode for UI/e2e using fixture seed path.
- Extend local e2e coverage for sync-required and sync-success flows.

## Acceptance criteria

- Sync failure responses include meaningful upstream error context.
- Search and sync UI show actionable messages when sync is unavailable.
- Local sync button can operate in deterministic fixture mode for repeatable local e2e.
- Local e2e tests cover both sync-required and sync-success search flows.
- Existing validation commands continue to pass.

## Out of scope

- Production market data source changes.
- CI-level e2e integration.

## Dependencies / Related

- BG-004 local e2e workflow and fixture endpoints.

## Implementation Plan

1. Harden corpCode parsing/error handling in connectors.
2. Return structured sync errors from worker and expose deterministic local sync mode hooks.
3. Update web API client/UI error rendering and sync flow behavior.
4. Expand local Playwright tests and update docs/spec/backlog.
5. Run validation and record outcomes.

## Task List

- [x] Harden OpenDART corpCode sync parsing and error handling.
- [x] Improve worker sync/search failure payloads and deterministic local sync mode wiring.
- [x] Improve admin-web error messaging and sync handling.
- [x] Add/adjust local e2e tests for sync-required and sync-success paths.
- [x] Run validation and finalize backlog updates.

## Implementation Notes

- 2026-04-11: Started after user reported sync blocked with generic error and requested stable e2e-aligned fix.
- 2026-04-11: Added `OpenDartSyncError` in connectors with explicit error codes (`OPENDART_API_KEY_MISSING`, `OPENDART_HTTP_ERROR`, `OPENDART_INVALID_ZIP_RESPONSE`, `OPENDART_CORPCODE_EMPTY`) and response preview detail for non-zip payloads.
- 2026-04-11: Worker sync endpoint now returns structured error payloads with code/detail, and web UI now surfaces actionable sync failure messages instead of only generic fetch errors.
- 2026-04-11: Extended Playwright suite with sync-required scenario coverage in addition to seeded-success summary/search flows.
- 2026-04-11: This execution environment still cannot keep long-running dev servers alive for in-session browser e2e execution; local e2e remains runnable via `pnpm e2e:local:stack` in user environment.

## Tests

- `pnpm install --frozen-lockfile` (pass)
- `pnpm -r --if-present lint` (pass)
- `pnpm -r --if-present typecheck` (pass)
- `pnpm -r --if-present test` (pass; no unit test files)
- `pnpm -r --if-present build` (pass)
- `pnpm -C apps/bot-worker deploy:check` (pass)
- Local e2e command available: `pnpm e2e:local:stack` (execute in user local/devcontainer session).
