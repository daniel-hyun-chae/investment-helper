# Product Spec

Specs define product behavior and are the source of truth for implementation intent.

## How to use spec files

- Keep each domain in its own file under `spec/`.
- Capture narrative context first, then explicit behavior assertions.
- Behavior assertions should be testable and mapped to test names.

## Assertion precedence

If narrative text and behavior assertions conflict, behavior assertions win.

## Backlog alignment

- Backlog items reference target spec sections in their `Spec:` field.
- Change-Orchestrator updates affected spec files as part of completion.

## Test naming convention

Use descriptive test names that map to behavior assertions directly.
