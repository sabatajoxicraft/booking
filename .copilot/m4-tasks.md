# M4 Task Board (Kickoff)

## Milestone Objective
- Increase production maturity after M3 by tightening governance automation, delivery speed, and operational confidence.

## Lane Backlog

| Lane | Task ID | Concrete Deliverable | Dependencies | Required Gates | Status |
|---|---|---|---|---|---|
| Governance | M4-G1 | Add explicit cross-gate handoff checklist artifact and evidence schema | M3 release baseline | Research Strategy, Release Governance, DRY | ✅ Complete |
| Governance | M4-G2 | Add trigger coverage audit to detect missing/duplicate specialist trigger rules | M4-G1 | KISS, DRY, Release Governance | ✅ Complete |
| Delivery | M4-D1 | Add milestone-close automation for board consistency + release tag validation | M3 release baseline | Release Governance, KISS | ✅ Complete |
| Reliability | M4-R1 | Add lightweight production smoke playbook and pass/fail capture process | M3 release baseline | Flow Integrity, Brand Consistency, Release Governance | ✅ Complete |

## Convergence and Acceptance

| Step | Owner | Dependencies | Required Gates | Status |
|---|---|---|---|---|
| M4-C1 Integrated governance merge | Architect | M4-G2 + M4-D1 + M4-R1 | DRY + KISS re-check | ⏳ Planned |
| M4-C2 Specialist gate sweep | BuildBot + Reviewer | M4-C1 | Research Strategy, Atomic Design, Flow Integrity, Brand Consistency, Release Governance | ⏳ Planned |
| M4-C3 CI + evidence validation | BuildBot | M4-C2 | lint/build/type-check + updated `.copilot/gate-evidence.json` | ⏳ Planned |
| M4-C4 Milestone acceptance | OVERSEER | M4-C3 | Board/document consistency + governance pass | ⏳ Planned |

## Notes
- Canonical booking flow remains owned by `.copilot/prd.md`.
- M4 focuses on governance and release-system maturity after M3 completion.
