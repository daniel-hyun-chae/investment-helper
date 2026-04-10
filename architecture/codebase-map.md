# Codebase Map

This map describes the initial scaffold for `investment-helper`.

## Project Root

| Path | Purpose |
|---|---|
| `.devcontainer/` | Dev container config and image build file. |
| `.github/workflows/` | CI and deployment workflows. |
| `.opencode-overrides/` | Product-specific agent and rule overrides. |
| `apps/` | Deployable applications (worker and admin web). |
| `packages/` | Shared contracts and domain packages. |
| `infra/` | Infrastructure config and SQL migrations. |
| `architecture/` | Architecture docs, glossary, and codebase map. |
| `backlog/` | Backlog item tracking (`proposed/`, `done/`, `archived-cr/`). |
| `decision-log/` | Architecture and library decision records. |
| `scripts/` | Devcontainer bootstrap and maintenance scripts. |
| `spec/` | Product behavior specifications. |
| `docker-compose.devcontainer.yml` | Local dev services and governance bridge. |
| `package.json` | Workspace root scripts and package manager policy. |
| `pnpm-workspace.yaml` | Workspace package boundaries. |

## Applications

### `apps/bot-worker`

- Cloudflare Worker scaffold for Telegram webhook, queue producers/consumers, and cron-driven polling.
- `wrangler.toml` contains worker name, queue bindings, and cron placeholder.

### `apps/admin-web`

- TanStack Start + Vite admin scaffold.
- Includes route placeholders and static build placeholder output for deployment pipeline wiring.

## Shared Packages

### `packages/contracts`

- Canonical types for subscriptions, disclosures, filing events, and analysis jobs.

### `packages/connectors`

- Interfaces and placeholders for external API connectors (OpenDART first).

### `packages/analysis`

- Analysis service contract, currently Node-first with Python-ready boundary.

## Infrastructure

### `infra/cloudflare`

- Deployment notes for worker, queue, cron, and admin hosting.

### `infra/supabase`

- `config.toml` scaffold and SQL migrations for initial subscriptions schema.

## Governance

- `backlog/README.md` tracks IDs and status.
- `spec/README.md` defines spec and test alignment rules.
- `decision-log/README.md` defines architecture decision conventions.

## Validation

Whenever module-level files or directories are added, removed, or renamed, update this map in the same change.
