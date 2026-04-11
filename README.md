# investment-helper

Telegram-first investment update assistant for external customers.

## What it does

- Collects market data from external APIs (OpenDART first).
- Normalizes disclosures into filing events.
- Maintains user subscriptions/watchlists.
- Delivers user-friendly updates through Telegram.
- Provides a basic admin surface for operational monitoring.

## Prerequisites

- Docker + Dev Containers (recommended workflow)
- Node.js 20+ and pnpm 9+ (for non-container local runs)
- Cloudflare account (Workers/Queues)
- Supabase project (Postgres)
- Telegram bot token
- OpenDART API key

## Getting started (Dev Container)

1. Open repository root in VS Code or Cursor.
2. Reopen in container.
3. From `project/`, install dependencies:

```bash
pnpm install --frozen-lockfile
```

4. Run services:

```bash
pnpm -C apps/bot-worker dev
pnpm -C apps/admin-web dev
```

## Local end-to-end development workflow

Use this workflow for realistic local checks after each change request.

1. Start local Supabase:

```bash
pnpm supabase:start
pnpm supabase:db:push
```

2. Generate local env files from local Supabase status:

```bash
pnpm dev:configure-local-env
```

This writes:

- `apps/bot-worker/.dev.vars` (local worker secrets/vars)
- `apps/admin-web/.env.local` (local API base URL)

3. Start web and worker together:

```bash
pnpm dev:all
```

4. Explicitly sync company directory (option B behavior):

```bash
pnpm dev:sync-companies
```

5. For deterministic local e2e, seed fixtures and run tests:

```bash
pnpm dev:seed-fixtures
pnpm e2e:local
```

If sync fails in UI, the message now includes OpenDART upstream context (for example invalid zip response, missing key, or HTTP failure) so you can diagnose quickly.

Or run helper that starts web/worker and runs e2e:

```bash
pnpm e2e:local:stack
```

6. Stop local Supabase when done:

```bash
pnpm supabase:stop
```

## Project structure

```text
project/
  apps/
    bot-worker/
    admin-web/
  packages/
    contracts/
    connectors/
    analysis/
  infra/
    cloudflare/
    supabase/
  architecture/
  backlog/
  decision-log/
  spec/
```

## Root scripts

| Script | Purpose |
|---|---|
| `pnpm lint` | Run workspace lint commands where present |
| `pnpm typecheck` | Run workspace typecheck commands where present |
| `pnpm test` | Run workspace tests where present |
| `pnpm build` | Build all workspace packages/apps |
| `pnpm dev:all` | Run worker and web dev servers together |
| `pnpm dev:configure-local-env` | Write local `.env` files from Supabase local status |
| `pnpm dev:sync-companies` | Explicitly sync company directory before search |
| `pnpm dev:seed-fixtures` | Seed deterministic local fixture data for summary/search |
| `pnpm e2e:local` | Run Playwright local e2e tests (not CI) |

## Environment variables

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot authentication token |
| `OPENDART_API_KEY` | OpenDART API key |
| `SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key for safe client calls |
| `SUPABASE_SECRET_KEY` | Supabase secret key for server-side operations |
| `OPENDART_REFRESH_CHECK` | Worker toggle (`0`/`false` to skip OpenDART refresh checks in local deterministic flows) |
| `SUPABASE_ACCESS_TOKEN` | Supabase access token for CI migration commands |
| `SUPABASE_PROJECT_URL` | Supabase project URL used to derive project ref in CI |
| `SUPABASE_DB_PASSWORD` | Supabase database password used by `supabase link` in CI |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string (local/dev queue tooling) |
| `CLOUDFLARE_API_TOKEN` | CI/CD deployment token for Cloudflare |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |

## Ports

| Service | Port |
|---|---|
| Admin web dev server | 3000 |
| Worker local dev | 8787 |
| Postgres (host mapped) | 5433 |
| Redis (host mapped) | 6380 |
