# BG-006 - Stabilize Playwright local e2e workflow and fixture-driven tests

Priority: P1
Status: Done
Theme: Quality
Spec: spec/README.md

## Why now

Local end-to-end testing was unreliable and frequently failing in this environment. Playwright setup and orchestration needed to be stabilized so contributors can run and trust e2e checks before shipping changes.

## What changes

- Hardened Playwright command wiring and browser setup for local/devcontainer runs.
- Improved local e2e orchestration script with strict readiness checks and diagnostics.
- Updated worker dev-fixture gate so deterministic local fixture endpoints are usable for e2e.
- Ensured the existing company summary e2e flow runs successfully in local stack mode.

## Acceptance criteria

- `pnpm e2e:local:stack` starts required services and fails fast with clear diagnostics when prerequisites are missing.
- Playwright command resolution works without `playwright: not found` errors.
- Fixture endpoints used by e2e tests are reachable in local development mode.
- Existing company summary e2e spec passes in local stack mode.

## Out of scope

- New product behavior unrelated to local testing and fixture bootstrapping.
- Cloud-hosted browser testing infrastructure.

## Dependencies / Related

- Reused reliable Playwright/devcontainer patterns from `../learn-active`.

## Implementation Plan

1. Update root Playwright scripts/config for deterministic invocation and safer defaults.
2. Harden local e2e runner script to verify readiness and provide useful logs.
3. Relax fixture gating constraints for local test mode while preserving guardrails.
4. Run local e2e stack and iterate until passing.

## Task List

- [x] Update Playwright scripts/config.
- [x] Improve local e2e orchestration script.
- [x] Adjust worker fixture gate behavior for local e2e.
- [x] Validate with `pnpm e2e:local:stack` and record results.
- [x] Update backlog status/table when complete.

## Implementation Notes

- Updated root e2e scripts to use `pnpm exec playwright` and added explicit browser install script.
- Hardened `playwright.config.ts` with retries/reporting and failure artifacts.
- Updated `apps/admin-web` Vite server config to `strictPort: true` to avoid silent port drift from 3000.
- Relaxed worker dev-fixture gate by removing local-Supabase-host requirement; local request + dev env + flag are now sufficient.
- Hardened `scripts/local-e2e.sh` with local Supabase startup checks, local env generation, browser install, deterministic readiness waits, dynamic free-port allocation, and automatic cleanup.
- Local Supabase startup in this environment failed when edge-runtime tried remote Deno imports with unknown issuer. Updated `supabase:start` to exclude `edge-runtime`, `logflare`, and `vector` for local e2e stack runs.
- Fixed route rendering and selector stability issues that caused false-negative e2e failures:
  - Added `<Outlet />` to `apps/admin-web/src/routes/companies.tsx` so nested summary route content renders.
  - Updated e2e selectors to match actual accessibility roles/labels and disambiguated overlapping button names.

## Tests

- `pnpm install --frozen-lockfile` (pass)
- `pnpm -r --if-present lint` (pass)
- `pnpm -r --if-present typecheck` (pass)
- `pnpm -r --if-present test` (pass)
- `pnpm -r --if-present build` (pass)
- `pnpm e2e:local:stack` (pass, 4/4 tests)
