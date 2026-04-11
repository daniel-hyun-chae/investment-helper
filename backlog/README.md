# Backlog

The backlog tracks all implementation work that changes product behavior, architecture, or delivery.

## Structure

- `proposed/`: active and upcoming backlog items.
- `done/`: completed backlog items.
- `archived-cr/`: superseded planning artifacts that should be kept for traceability.

## Conventions

- ID format: `BG-NNN`.
- Current next ID: `BG-011`.
- Priority scale: `P0` (critical) to `P3` (low).
- Status lifecycle: `Proposed` -> `Ready` -> `In Progress` -> `Done`.

## Backlog Item Template

Each backlog item should contain:

- Title
- Priority
- Status
- Theme
- Spec
- Why now
- What changes
- Acceptance criteria
- Out of scope
- Dependencies / Related
- Notes

Change-Orchestrator appends and maintains:

- Implementation Plan
- Task List
- Implementation Notes
- Tests

## Current Items

| ID | Title | Status |
|---|---|---|
| BG-010 | Fix summary subrequest limit and refresh-check redirect failures | Done |
| BG-009 | Non-blocking batched company directory sync for OpenDART | Done |
| BG-008 | Add and run real OpenDART e2e automation | Done |
| BG-005 | Stabilize company sync and search error handling with deterministic local sync mode | Done |
| BG-007 | Fix company directory sync 503 handling and strengthen e2e sync assertions | Done |
| BG-006 | Stabilize Playwright local e2e workflow and fixture-driven tests | Done |
| BG-004 | Local dev orchestration, local e2e workflow, and company search reliability | Done |
| BG-003 | Fix Cloudflare Pages deployment for admin web static routing | Done |
| BG-002 | OpenDART company summary trend graph with cached refresh checks | Done |
| BG-001 | Bootstrap investment-helper project workspace | Done |
