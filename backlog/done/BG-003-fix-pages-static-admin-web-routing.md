# BG-003 - Fix Cloudflare Pages deployment for admin web static routing

Priority: P0
Status: Done
Theme: Delivery and hosting
Spec: spec/README.md

## Why now

The deployed admin web URL returns 404 because the current build artifact does not include a static entry page suitable for Cloudflare Pages static hosting.

## What changes

- Convert admin web runtime from TanStack Start SSR-style output to a static SPA build that emits `index.html` and client assets.
- Keep existing company search and summary routes functional under static hosting.
- Ensure deployment artifacts are valid for Cloudflare Pages and route fallback behavior is configured for client-side navigation.

## Acceptance criteria

- `pnpm -C apps/admin-web build` outputs a static deploy artifact containing `dist/index.html`.
- Cloudflare Pages deployment can serve `/` without returning 404.
- Client routes (`/companies`, `/companies/:corpCode/summary`) load from direct URL access after deployment.
- Existing workspace validation commands continue to pass.

## Out of scope

- SSR rendering for admin web.
- Worker-based SSR hosting migration.

## Dependencies / Related

- Existing Cloudflare Pages deployment workflow in `.github/workflows/deploy.yml`.
- Existing admin-web route components in `apps/admin-web/src/routes`.

## Notes

- Root cause observed in deployment logs: Pages upload succeeded, but app artifact lacked static root entrypoint expected by Pages static serving.

## Implementation Plan

1. Add SPA entry files (`index.html`, `src/main.tsx`) and simplify root route rendering for browser-only app boot.
2. Update Vite configuration to static React build mode and remove SSR-specific plugin usage.
3. Add Cloudflare Pages SPA fallback file for deep-link routing.
4. Run full validation and capture evidence, then complete backlog bookkeeping.

## Task List

- [x] Add static admin web entrypoint files and route bootstrapping.
- [x] Update admin web Vite config and root route for SPA mode.
- [x] Add Pages SPA fallback support for deep links.
- [x] Run validation commands and record results.
- [x] Update architecture/spec docs if needed and close backlog item.

## Implementation Notes

- 2026-04-11: Started after user requested Option A (static SPA on Pages).
- 2026-04-11: Added `apps/admin-web/index.html` and `apps/admin-web/src/main.tsx` to bootstrap the router as a browser SPA.
- 2026-04-11: Removed TanStack Start Vite plugin from `apps/admin-web/vite.config.ts` and simplified `__root` route to render only `<Outlet />` for client runtime.
- 2026-04-11: Added `apps/admin-web/public/_redirects` with `/* /index.html 200` so Cloudflare Pages serves deep links (`/companies`, `/companies/:corpCode/summary`) through SPA fallback.
- 2026-04-11: Verified built artifact now includes `apps/admin-web/dist/index.html` and `_redirects`.

## Tests

- `pnpm install --frozen-lockfile` (pass after lockfile refresh)
- `pnpm -r --if-present lint` (pass)
- `pnpm -r --if-present typecheck` (pass)
- `pnpm -r --if-present test` (pass; no test files)
- `pnpm -r --if-present build` (pass)
- `pnpm -C apps/bot-worker deploy:check` (pass)
- Artifact check: `apps/admin-web/dist/index.html` exists (pass)
