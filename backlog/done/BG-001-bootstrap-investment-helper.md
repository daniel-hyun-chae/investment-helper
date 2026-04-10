# BG-001 - Bootstrap investment-helper project workspace

Priority: P0
Status: Done
Theme: Foundation
Spec: spec/README.md

## Why now

The repository needs a complete project scaffold under `project/` so implementation work can start with a reproducible dev environment, governance artifacts, and deploy-ready CI/CD.

## What changes

- Create devcontainer, docker compose, and startup scripts for repeatable local development.
- Seed governance overrides, architecture docs, backlog/spec/decision scaffolding, and project README.
- Create initial Cloudflare Worker + Supabase + TanStack Start monorepo layout.
- Add CI and deployment workflows for public hosting from day one.

## Acceptance criteria

- `project/` contains all required governance and stack bootstrap files.
- Devcontainer is configured with OpenCode mounts and init commands.
- CI and deploy workflow files exist and reference Cloudflare/Supabase secrets.
- Stack config files exist and dependencies install with `pnpm`.

## Out of scope

- Full business logic implementation for ingestion, subscription lifecycle, and alert formatting.
- Production cloud provisioning beyond CI/CD and config scaffolding.

## Dependencies / Related

- Reference implementation patterns from `../Invariant` where useful.

## Implementation Plan

1. Scaffold directory structure and required governance files from templates.
2. Configure devcontainer and scripts with Cloudflare/Supabase-friendly defaults.
3. Add monorepo package structure for worker, admin, and shared packages.
4. Add CI/deploy workflows and infra config placeholders.
5. Validate file structure and installability, then finalize docs and backlog status.

## Task List

- [x] Create required project directory tree.
- [x] Add devcontainer files and permission/OpenCode scripts.
- [x] Add governance overrides and product guidelines.
- [x] Add architecture, backlog, spec, decision-log, and project README files.
- [x] Add stack config files and starter source files.
- [x] Add CI/CD workflows and infra config placeholders.
- [x] Run bootstrap validation commands and record results.
- [x] Move item to done and update backlog summary.

## Implementation Notes

- User selected Cloudflare Workers + Queues with Supabase and Telegram-only identity for v1.
- Future LLM pipeline is scaffolded as Node-first with Python-ready boundaries in `packages/analysis` and shared contracts.
- `../Invariant` was checked for reference style; local Postgres docker-compose pattern informed devcontainer DB defaults.
- TanStack Start starter patterns were validated against TanStack official `start-bare` example.
- Dependency alignment adjustments made during validation:
  - Upgraded Vite/plugin-react compatibility to Vite 8 + plugin-react 6.
  - Aligned TanStack package versions to available published set (`@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-router-devtools` at 1.166.11 range).
  - Added root `@types/node` for shared package typecheck consistency.
  - Added `pnpm.onlyBuiltDependencies` entries for `esbuild`, `workerd`, and `sharp` to keep installs non-interactive.

## Tests

- `pnpm install --frozen-lockfile` (pass)
- `pnpm -r --if-present lint` (pass)
- `pnpm -r --if-present typecheck` (pass)
- `pnpm -r --if-present test` (pass; no test files yet in scaffold packages/apps)
- `pnpm -r --if-present build` (pass; admin web builds client/server artifacts)
- `pnpm -C apps/bot-worker deploy:check` (pass; wrangler dry-run completed)
