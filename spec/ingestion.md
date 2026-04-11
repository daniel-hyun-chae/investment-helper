# Ingestion Spec

## Scope

Connector polling, normalization, and analysis job enqueueing.

## Behaviors

- OpenDART connector fetches disclosures on schedule.
- Connector payloads are validated before normalization.
- Normalized filing events use a shared schema contract.
- Ingestion jobs are idempotent across repeated polling windows.
- Analysis jobs are enqueued for newly detected filing events.
- OpenDART corpCode zip ingestion populates the local company directory used by company search.
- Company summary financial ingestion uses first-request fetch and durable cache reuse for repeated requests.
- Company summary refresh checks use incremental periodic disclosure detection before deciding to re-fetch financial points.
