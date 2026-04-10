# Architecture Overview

## System Shape

- **Telegram Bot Worker (Cloudflare Workers)**: receives Telegram webhook updates, validates commands, schedules ingestion, and dispatches notifications.
- **Ingestion and Analysis Pipeline (Workers Queues + Cron)**: polls source APIs (OpenDART first), normalizes filing events, and enqueues analysis jobs.
- **Data Store (Supabase Postgres)**: stores durable subscriptions/watchlists and pipeline metadata.
- **Admin Web (TanStack Start + Vite)**: basic operations view for subscription and ingestion health.
- **Shared Packages**: contracts, connectors, and analysis interfaces reused by worker and admin.

## Technology Stack

| Layer | Technology |
|---|---|
| Language/runtime | TypeScript on Node.js 20 (dev), Cloudflare Workers runtime (deploy) |
| Bot/API edge | Cloudflare Workers |
| Queue/scheduler | Cloudflare Queues and Cron Triggers |
| Database | Supabase Postgres |
| Frontend/admin | TanStack Start + Vite + React |
| Validation | Zod |
| Tooling | pnpm workspaces, Vitest, TypeScript |
| CI/CD | GitHub Actions |

## Data Flow

1. Telegram sends command/update to worker webhook endpoint.
2. Worker validates command and reads/writes subscription records in Supabase.
3. Cron trigger or command-driven event invokes connector polling.
4. Connector normalizes external payloads into filing events.
5. Filing events are enqueued as analysis jobs.
6. Worker consumes analysis jobs and emits user-facing Telegram summaries.

## Authentication

- v1 identity is Telegram user ID only.
- Database schema reserves migration path to first-class users later.
- Admin surface is internal and should be protected behind access controls before production use.

## Deployment

| Environment | Worker | Database | Admin |
|---|---|---|---|
| Local devcontainer | wrangler local dev | local postgres in docker-compose | vite dev |
| Hosted | Cloudflare Workers | Supabase hosted Postgres | Cloudflare Pages |

## Local Development

Run from `project/`:

```bash
pnpm install --frozen-lockfile
pnpm -C apps/bot-worker dev
pnpm -C apps/admin-web dev
pnpm -r --if-present test
pnpm -r --if-present build
```
