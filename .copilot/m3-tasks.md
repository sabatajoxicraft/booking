# M3 Task Board (In Progress)

## Baseline
- M2 is complete and released (`M2-complete`).
- Live baseline is hosted on GitHub Pages.
- Canonical booking flow remains owned by `.copilot/prd.md`.

## Scope and Outcomes
1. Strengthen booking conversion and completion reliability.
2. Improve provider-side operational efficiency.
3. Raise production readiness (observability, quality, and release confidence).

## Lane Backlog

| Lane | Task ID | Concrete Deliverable | Dependencies | Required Gates | Status |
|---|---|---|---|---|---|
| Conversion | M3-C1 | Add service/provider recommendation hints and reduce booking decision friction in discovery/select flow | M2 baseline | Brand Consistency, Flow Integrity, KISS | Ready |
| Conversion | M3-C2 | Add booking completion telemetry events for each journey step with explicit drop-off reasons | M3-C1 | DRY, Flow Integrity, Release Governance | Ready |
| Provider Ops | M3-P1 | Add provider day-plan panel (today/tomorrow) with actionable queue summaries | M2 admin baseline | Atomic Design, Flow Integrity, KISS | Ready |
| Provider Ops | M3-P2 | Add provider bulk actions guardrails (safe state checks and confirmation UX) | M3-P1 | Flow Integrity, DRY, Brand Consistency | Ready |
| Reliability | M3-R1 | Add API/service health indicators and fallback messaging on booking and provider surfaces | M2 notifications baseline | Flow Integrity, Brand Consistency, KISS | Ready |
| Reliability | M3-R2 | Add release-readiness checklist automation (gate evidence freshness + CI badge check) | M3-R1 | Release Governance, DRY | Ready |

## Convergence and Acceptance

| Step | Owner | Dependencies | Required Gates | Status |
|---|---|---|---|---|
| M3-CV1 Integrated merge | Architect | M3-C2 + M3-P2 + M3-R2 | DRY + KISS re-check | Pending |
| M3-CV2 Specialist sweep | BuildBot + Reviewer | M3-CV1 | Atomic Design, Flow Integrity, Brand Consistency, Release Governance | Pending |
| M3-CV3 CI + evidence validation | BuildBot | M3-CV2 | lint/build/type-check pass + updated `.copilot/gate-evidence.json` | Pending |
| M3-CV4 Milestone acceptance | OVERSEER | M3-CV3 | Board/document consistency + governance pass | Pending |

## Notes
- M3 work must not redefine canonical booking steps in `.copilot/prd.md`.
- Release governance remains mandatory before merge/release decisions.
