# Product Guidelines (investment-helper)

## Localization

- v1 content is English-first for admin surfaces and Telegram command responses.
- Keep all user-facing message templates in centralized constants for future i18n expansion.

## Lockfile and Package Management

- Package manager: `pnpm`.
- Lockfile: `pnpm-lock.yaml` must be committed and up to date.
- Validation command:

```bash
pnpm install --frozen-lockfile
```

## Seed and Fixture Data

- Test fixtures must avoid real Telegram chat IDs and production API keys.
- Use synthetic company identifiers and mocked disclosure payloads for integration tests.

## Implementation Gate

Before completing work, run from `project/`:

```bash
pnpm install --frozen-lockfile
pnpm -r --if-present lint
pnpm -r --if-present typecheck
pnpm -r --if-present test
pnpm -r --if-present build
```
