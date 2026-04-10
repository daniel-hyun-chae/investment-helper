# Change-Orchestrator Override

## Test commands

Run commands from `project/`.

| Purpose | Command |
|---|---|
| Install dependencies | `pnpm install --frozen-lockfile` |
| Lint | `pnpm -r --if-present lint` |
| Typecheck | `pnpm -r --if-present typecheck` |
| Unit and integration tests | `pnpm -r --if-present test` |
| Build all packages | `pnpm -r --if-present build` |
| Worker deploy dry run | `pnpm -C apps/bot-worker deploy:check` |

## Product-specific testing patterns

- Verify Telegram command parsing for `/start`, `/watch <symbol>`, `/unwatch <symbol>`, `/list`.
- Verify queue payload schema validation before analysis jobs are enqueued.
- Verify scheduled polling is idempotent and does not duplicate notifications.
- Verify subscription writes and reads against Supabase Postgres.
- Verify admin health and ingestion status endpoints return expected fields.

## CI-equivalent validation

```bash
pnpm install --frozen-lockfile
pnpm -r --if-present lint
pnpm -r --if-present typecheck
pnpm -r --if-present test
pnpm -r --if-present build
pnpm -C apps/bot-worker deploy:check
```
