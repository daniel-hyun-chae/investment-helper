# BG-004 - Local dev orchestration, local e2e workflow, and company search reliability

Priority: P0
Status: In Progress
Theme: Developer experience and reliability
Spec: spec/company-summary.md, spec/ingestion.md, spec/README.md

## Why now

Current local workflows are fragmented and search can fail unexpectedly, which slows iteration and makes it hard to catch regressions quickly. The product needs a repeatable local setup and realistic e2e checks that run on demand during development.

## What changes

- Add one-command local development workflow to run web and worker together with documented local Supabase usage.
- Add explicit sync-first behavior for company directory search (no automatic OpenDART sync on search).
- Add local-development endpoints/utilities for deterministic fixture seeding so e2e can run without external API dependency.
- Add Playwright-based local e2e tests for search and summary interactions.
- Fix current search failure paths and improve UI error/sync guidance.

## Acceptance criteria

- Repository includes documented commands to run local stack components and local e2e checks on demand.
- Company search no longer auto-fetches OpenDART data; it requires prior explicit sync/seed.
- Search UX clearly indicates when directory sync is required and provides a manual sync action.
- A developer can run local Playwright tests that cover search and summary controls without adding e2e to CI.
- Existing validation commands continue to pass.

## Out of scope

- Adding e2e tests to CI pipeline.
- Replacing Supabase/PostgREST with a different local data backend.

## Dependencies / Related

- Existing BG-002 company summary/search APIs and schema.
- Cloudflare Worker local dev runtime and Supabase configuration.

## Notes

- User requested explicit sync-first behavior (option B).
- User requested e2e execution only during local development after change requests.

## Implementation Plan

1. Add backlog-safe local orchestration scripts and developer docs for running worker/web/sync/e2e locally.
2. Update worker search flow to require explicit sync and add development-only fixture seed/reset endpoints.
3. Update web search UX to surface sync-required state and trigger explicit sync.
4. Add Playwright config and realistic local e2e tests for search and summary controls.
5. Validate all required commands, then finalize specs/docs and backlog state.

## Task List

- [x] Add local dev scripts and docs for web/worker/sync/e2e flows.
- [x] Update worker endpoints for explicit sync-first search and dev fixture seed/reset support.
- [x] Update admin-web search UX for sync-required handling and manual sync action.
- [x] Add Playwright local e2e suite and fixtures.
- [x] Run validation and local e2e, then record results.
- [x] Move item to done and update backlog summary.

## Implementation Notes

- 2026-04-11: Started after user confirmed Playwright, local-only e2e execution, and explicit sync-first behavior.
- 2026-04-11: Added worker sync-first API contract (`GET/POST /api/companies/sync`) and changed search/summary behavior to return `DIRECTORY_NOT_SYNCED` instead of auto-syncing implicitly.
- 2026-04-11: Added local development fixture endpoints (`POST /api/dev/fixtures/seed`, `POST /api/dev/fixtures/reset`) gated to local requests and non-production env.
- 2026-04-11: Added admin-web sync UX (manual sync button, sync-required error handling) and reduced noisy search requests by requiring at least 2 query characters.
- 2026-04-11: Added local tooling for deterministic e2e (`playwright.config.ts`, `tests/e2e/company-summary.spec.ts`, `scripts/local-e2e.sh`, `scripts/configure-local-env.mjs`).
- 2026-04-11: Added root scripts for local orchestration (`dev:all`, `supabase:*`, `dev:configure-local-env`, `dev:seed-fixtures`, `e2e:local*`).
- 2026-04-11: Hardened dev-only fixture endpoints with explicit gating (`ALLOW_DEV_FIXTURES=1`, localhost request origin, localhost Supabase URL, non-production APP_ENV).
- 2026-04-11: This execution environment cannot keep long-running `wrangler dev`/`vite dev` processes alive through command completion, so local Playwright run could not be completed here despite added scripts/tests; instructions provided in README for user-hosted execution.

## Tests

- `pnpm install --frozen-lockfile` (pass)
- `pnpm -r --if-present lint` (pass)
- `pnpm -r --if-present typecheck` (pass)
- `pnpm -r --if-present test` (pass; no unit test files)
- `pnpm -r --if-present build` (pass)
- `pnpm -C apps/bot-worker deploy:check` (pass)
- Local e2e execution in this environment: blocked by process lifecycle limits for long-running local dev servers; run `pnpm e2e:local:stack` in user local/devcontainer environment.
