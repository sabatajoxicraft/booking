# DRY Gate Handler

## Purpose
Prevent unmanaged duplication in logic, documentation, and flow definitions.

## Checks
- Canonical concepts are defined once and referenced elsewhere.
- Repeated blocks are abstracted or documented as intentional.

## Fail If
- Duplicate content diverges across milestone, PRD, or task-board docs.
- Same rule requires updates in multiple places without a source-of-truth anchor.
