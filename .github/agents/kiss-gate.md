# KISS Gate Handler

## Purpose
Block unnecessary complexity and enforce the simplest workable flow.

## Checks
- One primary path per user outcome.
- No redundant branches without explicit requirement.
- Naming and intent are immediately understandable.

## Fail If
- Multiple equivalent branches exist.
- Control flow obscures the canonical booking journey.
