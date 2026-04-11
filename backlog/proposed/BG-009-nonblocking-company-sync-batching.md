# BG-009 - Non-blocking batched company directory sync for OpenDART

Priority: P0
Status: In Progress
Theme: Reliability and runtime stability
Spec: spec/company-summary.md, spec/ingestion.md, spec/README.md

## Why now

Manual OpenDART corpCode requests succeed, but deployed `POST /api/companies/sync` hangs and times out. This indicates request-time processing in worker is too heavy for full-directory sync in a single request cycle.

## What changes

- Change company sync endpoint to batched processing with cursor/offset contract.
- Return progress payload (`done`, `nextOffset`, `imported`, `total`) per batch.
- Update web sync UX to run sequential batch sync until completion.
- Update real-DART e2e to validate batched sync completion before search assertions.

## Acceptance criteria

- `POST /api/companies/sync` returns within practical request time with progress payload.
- Repeated sync calls eventually complete full directory ingest.
- Web sync button completes sync using batch loop without timing out single request.
- Real-DART e2e covers batched sync behavior.

## Out of scope

- Queue-based async sync orchestration.

## Dependencies / Related

- BG-008 real-DART e2e automation.

## Implementation Plan

1. Implement batched sync helper and API response contract in bot-worker.
2. Update admin-web API client + UI sync loop for batch completion.
3. Update real-DART e2e to sync via batch loop.
4. Run validation and e2e rerun; record outcomes.

## Task List

- [x] Add worker batched sync API behavior.
- [ ] Update admin-web sync client and UI flow for batched completion.
- [ ] Update real-DART e2e sync helper for batch completion.
- [ ] Run validation and record outcomes.
- [ ] Move item to done and update backlog summary.

## Implementation Notes

- 2026-04-11: Started after manual OpenDART check confirmed corpCode endpoint success with valid token.
- 2026-04-11: Manual OpenDART token probe from this session succeeded quickly (`status 200`, zip signature `PK`, ~2.9s). This disproves key/network failure for direct calls.
- 2026-04-11: Deployed worker `POST /api/companies/sync` still timed out with no response body (even with `offset=0&limit=1`), indicating deployed runtime path is still blocking and likely running older/non-batched code.
- 2026-04-11: Added batched sync API shape in worker source and replaced XML parser dependency with faster string-scan parser for corpCode payload extraction.
- 2026-04-11: Real-DART e2e rerun still timed out against currently deployed worker host; this validates deployment/runtime mismatch remains unresolved until worker is redeployed with latest code.

## Tests

- Pending.
