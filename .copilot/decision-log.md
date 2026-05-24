# Decision Log

| ID | Decision | Owner | Rationale | Status |
|---|---|---|---|---|
| DL-01 | Re-open M1 and remove "M1 complete" posture | OVERSEER | Governance documents contradicted execution reality | Applied |
| DL-02 | Make brand identity and booking flow the PRD center | OVERSEER | Product coherence requires one canonical journey | Applied |
| DL-03 | Adopt Fresha-inspired lessons as operating constraints | OVERSEER | Proven booking UX patterns reduce friction and drop-off | Applied |
| DL-04 | Introduce specialist gate handlers (KISS, DRY, Atomic, Flow, Brand) | OVERSEER | Measurable quality checks need explicit ownership and triggers | Applied |
| DL-05 | Execute via fast-track model: golden path first, then parallel lanes | OVERSEER | Reduces integration risk and accelerates validated delivery | Applied |
| DL-06 | Standardize release governance defaults (trunk-based branching, SemVer, on-demand post-gate releases) | OVERSEER | Release-governance checks need explicit policy defaults for consistent pass/fail decisions | Applied |

## Exception and Escalation Logging Rules
- Every exception request must create a new Decision Log entry before merge/release.
- The entry must include: **Decision**, explicit **Owner**, and explicit **Rationale**.
- Exception owner is accountable for remediation date or closure decision.
- `release-governance-gate` fails if an exception is used without a matching logged entry.
