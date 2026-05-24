# Delegate Handoff

## Gate Ownership Matrix

| Gate | Primary Runner | Support | Run When | Pass Output |
|---|---|---|---|---|
| KISS | Reviewer | Architect | After each major slice | Complexity hotspots reduced and justified |
| DRY | Reviewer | Architect | On repeated patterns or duplicated logic | Duplication report resolved or accepted with reason |
| Atomic Design | Architect | Reviewer | UI composition changes | Components follow atomic boundaries |
| Flow Integrity | Reviewer | Architect | Booking-state or transition changes | Valid transitions and next actions are explicit |
| Brand Consistency | Reviewer | Architect | User-facing text/experience changes | Tone, promise, and clarity remain aligned |
| release-governance-gate | BuildBot + Reviewer | OVERSEER | CI/CD, branch, release, or versioning changes; merge-to-main candidates; policy exceptions | Release readiness report with pass/fail, required actions, checklist status, and exception reference (if any) |

## Operating Sequence
1. Golden-path implementation and gate pass.
2. Parallel lanes run with lane-specific gate checks.
3. Integrated gate sweep before milestone acceptance.

## Release Governance Policy Defaults
- **Branching:** Trunk-based development with protected `main`; short-lived branches only.
- **Versioning:** SemVer required for every release decision.
- **Release cadence:** On-demand, only after `release-governance-gate` pass.

## Exception and Escalation Flow
1. Requester raises exception with explicit owner and rationale.
2. Owner logs the exception in `.copilot/decision-log.md` before merge/release.
3. OVERSEER confirms escalation path and risk acceptance.
4. `release-governance-gate` verifies the log entry and either passes with conditions or fails.
