# BG-011 - Fix company sync completeness and summary metric coverage

Priority: P0
Status: In Progress
Theme: Runtime reliability
Spec: spec/company-summary.md, spec/ingestion.md, spec/README.md

## Why now

Users report missing expected companies (for example SK hynix) and empty summary graphs for available companies. Current sync behavior can skip full directory population, and summary metric aggregation is too strict for partially available financial rows.

## What changes

- Ensure company sync performs full directory import (no partial-cache short-circuit that hides expected companies).
- Reduce sync subrequest pressure by larger DB upsert chunks while keeping one invocation sync flow.
- Improve financial metric extraction with OpenDART account-id matching fallback.
- Relax yearly/TTM aggregation to sum available values instead of dropping series when one quarter is null.

## Acceptance criteria

- Synced company directory includes expected listed companies such as SK hynix.
- Sync endpoint returns completion payload without partial-cache skip behavior.
- Summary graph for data-available companies shows non-empty points for supported metrics.
- Existing validations pass.

## Out of scope

- New market-cap data source integration.

## Dependencies / Related

- BG-010 summary runtime hardening.

## Implementation Plan

1. Update worker sync endpoint to full import behavior and remove partial-cache skip logic.
2. Improve OpenDART account metric extraction robustness.
3. Improve summary aggregation to avoid all-null series when partial quarter data exists.
4. Validate and update backlog tracking.

## Task List

- [x] Update sync import behavior for completeness.
- [x] Improve connector metric extraction logic.
- [x] Improve summary aggregation for partial quarterly data.
- [x] Run validation and finalize item.

## Implementation Notes

- 2026-04-11: Started after user reported missing expected companies and empty summary graphs.
- 2026-04-11: Removed sync short-circuit that skipped full import when any cached directory rows existed; sync now progresses in batches and completes full directory coverage.
- 2026-04-11: Increased sync batch size to 1200 for better throughput while preserving batched request model.
- 2026-04-11: Added account-id based metric matching fallback for revenue/operating income/SGA/cost-of-sales extraction to improve coverage when account names differ.
- 2026-04-11: Relaxed summary `sumNullable` aggregation so yearly/TTM series remain visible when some quarterly points are null.
- 2026-04-11: Updated sync completion notice to show explicit progress imported/total and batch count.

## Tests

- `pnpm install --frozen-lockfile` (pass)
- `pnpm -r --if-present lint` (pass)
- `pnpm -r --if-present typecheck` (pass)
- `pnpm -r --if-present test` (pass; no unit test files)
- `pnpm -r --if-present build` (pass)
- `pnpm -C apps/bot-worker deploy:check` (pass)
