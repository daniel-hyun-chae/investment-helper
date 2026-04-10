# Cloudflare Deployment Notes

## Components

- Worker: `apps/bot-worker`
- Queue: `investment-helper-analysis`
- Cron trigger: every 10 minutes (`*/10 * * * *`)
- Admin hosting: Cloudflare Pages project `investment-helper-admin`

## Required secrets (GitHub Actions)

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `PUBLIC_BASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `OPENDART_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Local commands

From `project/`:

```bash
pnpm -C apps/bot-worker dev
pnpm -C apps/bot-worker deploy:check
pnpm -C apps/bot-worker deploy
```
