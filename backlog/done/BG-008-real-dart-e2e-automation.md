# BG-008 - Add and run real OpenDART e2e automation

Priority: P0
Status: In Progress
Theme: Reliability and validation
Spec: spec/company-summary.md, spec/README.md

## Why now

Sync failures are still reported in deployed usage. Deterministic fixture tests pass locally, but there is no dedicated automated browser test that exercises real OpenDART sync end-to-end and surfaces production-like failures with clear diagnostics.

## What changes

- Add a dedicated Playwright suite for real OpenDART flow (no fixture endpoints).
- Add npm scripts for running real-DART e2e on demand.
- Run the real-DART e2e from this session using deployed web and worker targets from environment.
- Improve failure output so sync response payload is visible when upstream is unavailable.

## Acceptance criteria

- A separate command exists to run real OpenDART e2e only when explicitly requested.
- Real-DART e2e performs sync request, search, and summary navigation in browser.
- Failures include detailed sync payload for fast diagnosis.
- Existing validation commands continue to pass.

## Out of scope

- CI integration of real-DART e2e.
- Replacing OpenDART as upstream data source.

## Dependencies / Related

- BG-004 local e2e harness.
- BG-005 sync error diagnostics.

## Implementation Plan

1. Add real-DART Playwright spec and run command.
2. Execute standard validation.
3. Install Playwright browser and execute real-DART e2e against deployed targets from `.env`.
4. Record outcomes and close item.

## Task List

- [x] Add real-DART Playwright test and scripts.
- [x] Run standard validation commands.
- [x] Run real-DART Playwright test from this session.
- [x] Update docs/backlog and close item.

## Implementation Notes

- 2026-04-11: Started after user asked to run tests directly from this session.
- 2026-04-11: Added `tests/e2e/company-summary.real-dart.spec.ts` and script `pnpm e2e:real-dart`.
- 2026-04-11: Installed Playwright browser dependencies in this session and executed `pnpm e2e:real-dart` against deployed URLs (`E2E_BASE_URL=https://investment-helper.pages.dev`, `E2E_WORKER_BASE_URL=${PUBLIC_BASE_URL}`).
- 2026-04-11: Real-DART e2e failed with Cloudflare Error 1042: configured worker host from `.env` (`gentle-water-961b.daniel-hyun-chae.workers.dev`) has no deployed worker script. This is a concrete environment misconfiguration, not a test harness failure.
- 2026-04-11: `wrangler whoami` in this environment confirms no authenticated Cloudflare session, so worker deployment cannot be corrected from this session.
- 2026-04-11: Normalized worker URL handling in real-dart spec to auto-prefix `https://` when host-only values are provided.
- 2026-04-11: Re-ran real-DART e2e against updated worker host `https://investment-helper-bot-worker.daniel-hyun-chae.workers.dev`. Both tests failed with `sync-timeout` after 90s. Direct `curl` probe to `POST /api/companies/sync` with 95s timeout also timed out with no response body, proving worker sync request hangs upstream before responding.

## Tests

- `pnpm -r --if-present lint` (pass)
- `pnpm -r --if-present typecheck` (pass)
- `pnpm -r --if-present test` (pass; no unit test files)
- `pnpm -r --if-present build` (pass)
- `pnpm -C apps/bot-worker deploy:check` (pass)
- `pnpm install --frozen-lockfile` (pass)
- `pnpm e2e:install-browsers` (pass)
- `pnpm e2e:real-dart` first run (fail with Cloudflare worker host error 1042: no script found for workers.dev host)
- `pnpm e2e:real-dart` second run with updated worker host (fail: `sync-timeout`)
- `curl -X POST https://investment-helper-bot-worker.daniel-hyun-chae.workers.dev/api/companies/sync --max-time 95` (timeout, no headers/body)
