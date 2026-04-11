# BG-008 - Harden OpenDART sync transient-failure recovery

Priority: P0
Status: Done
Theme: Reliability
Spec: spec/company-summary.md, spec/ingestion.md

## Why now

Directory sync still returns 503 in real usage despite valid API credentials. We need stronger handling for transient transport/corrupt payload failures from OpenDART corpCode downloads and clearer UI retry guidance.

## What changes

- Treat additional transient OpenDART sync errors as cache-fallback candidates.
- Surface retryable sync errors consistently in UI.
- Record root-cause findings from direct API probing and update behavior docs.

## Acceptance criteria

- Transient corpCode transport/zip-parse failures do not hard-fail sync when cache exists.
- Admin sync error banner treats transient OpenDART network/zip failures as retryable service-unavailable guidance.
- Validation and local e2e remain green.

## Out of scope

- Replacing OpenDART corpCode endpoint with a different primary provider.

## Dependencies / Related

- Follow-up to BG-007.

## Implementation Plan

1. Expand transient fallback code set in worker sync handler.
2. Align admin retryable error handling codes.
3. Run validation and document findings.

## Task List

- [x] Expand worker transient fallback codes.
- [x] Expand admin retryable sync code handling.
- [x] Run validation and record results.
- [x] Move item to done and update backlog table.

## Implementation Notes

- Verified provided OpenDART token with direct API probes.
- `list.json` endpoint returned HTTP 200 and status `000` (token valid).
- `corpCode.xml` endpoint returned HTTP 200 headers but repeatedly timed out with partial download in this environment, producing corrupted/truncated zip payloads.
- Worker sync handling was updated to treat `OPENDART_NETWORK_ERROR` and `OPENDART_INVALID_ZIP_RESPONSE` as transient, cache-fallback-eligible conditions (same fallback model as 503/429).
- Admin sync UI retryable-banner handling expanded to include the new transient codes.
- This removes hard 503 outcomes when cache exists while preserving explicit service-unavailable guidance.

## Tests

- `pnpm -r --if-present typecheck` (pass)
- `pnpm e2e:local:stack` (pass)
- `pnpm install --frozen-lockfile` (pass)
- `pnpm -r --if-present lint` (pass)
- `pnpm -r --if-present typecheck` (pass)
- `pnpm -r --if-present test` (pass)
- `pnpm -r --if-present build` (pass)
- `pnpm e2e:local:stack` (pass, 4/4 tests)
