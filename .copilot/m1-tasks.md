# M1 Task Board (Post-Golden-Path)

## Baseline
- Golden path gate is **pass** in `.copilot/gate-evidence.json` (`scope: golden path`, `overallStatus: pass`).
- Parallel lanes are now execution-ready and may run concurrently.

## Parallel Lane Backlog (Execution Ready)

| Lane | Task ID | Concrete Deliverable | Dependencies | Required Gates | Status |
|---|---|---|---|---|---|
| Brand hardening | B1 | Audit booking UI copy/components against PRD tone + disclosure rules; produce exact fix list (file-level) before edits | Golden path pass | Brand Consistency, DRY | Ready |
| Brand hardening | B2 | Implement approved brand hardening fixes from B1 across booking flow surfaces | B1 | Brand Consistency, Atomic Design, DRY | Ready |
| Brand hardening | B3 | Run brand gate review + capture lane evidence for brand artifacts in `.copilot/gate-evidence.json` update package | B2 | Brand Consistency (pass required) | Ready |
| Provider ops coherence | P1 | Define provider ops canonical state map (service, availability, policy, confirmation handoff) aligned to PRD flow | Golden path pass | Flow Integrity, KISS | Ready |
| Provider ops coherence | P2 | Apply provider ops model updates to remove contradictory provider/customer states and duplicate logic | P1 | Flow Integrity, DRY, KISS | Ready |
| Provider ops coherence | P3 | Validate provider ops scenarios end-to-end and capture lane gate evidence payload | P2 | Flow Integrity (pass required) | Ready |
| Resilience & edge cases | R1 | Enumerate golden-path-adjacent failure/edge cases (timeouts, stale state, invalid transitions, partial data) with expected behavior | Golden path pass | KISS, Flow Integrity | Ready |
| Resilience & edge cases | R2 | Implement deterministic handling for prioritized edge cases with explicit user-safe recovery paths | R1 | Flow Integrity, DRY, KISS | Ready |
| Resilience & edge cases | R3 | Execute edge-case validation matrix and capture lane evidence payload | R2 | Flow Integrity (pass required) | Ready |

## Convergence and Milestone Closure Gates

| Step | Owner | Dependencies | Required Gates | Status |
|---|---|---|---|---|
| C1 Integrated lane merge | Architect | B3 + P3 + R3 | No unresolved cross-lane conflicts; DRY + KISS re-check | Pending |
| C2 Specialist gate sweep | BuildBot + Reviewer | C1 | Atomic Design, Flow Integrity, Brand Consistency, Release Governance | Pending |
| C3 CI + evidence validation | BuildBot | C2 | lint/build pass + `.copilot/gate-evidence.json` valid structure and updated lane evidence | Pending |
| C4 Milestone acceptance | OVERSEER | C3 | Board/document consistency + governance pass | Pending |

## Notes
- Canonical booking steps remain defined only in `.copilot/prd.md`.
- `Release Governance` remains mandatory before merge/release decisions.
- No lane closes without its required gate pass recorded in gate evidence artifacts.
