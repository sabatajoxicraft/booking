# Project Mandate

## Mission
Deliver a brand-consistent booking platform with a coherent end-to-end flow and measurable quality gates.

## Non-Negotiables
- Single canonical booking journey across all product docs.
- DRY/KISS/Atomic rules enforced through explicit failure conditions.
- Flow Integrity and Brand Consistency gates required for milestone progression.
- `release-governance-gate` required for branch, release, and version decisions.
- Recovery milestone truth overrides any prior "M1 complete" claims.

## Delivery Model
- Golden path first.
- Parallel lanes second.
- Integrated gate sweep before milestone closure.

## Release Governance Policy Defaults
- **Branching:** Trunk-based development with protected `main`; use short-lived branches and merge only after required gates pass.
- **Versioning:** Semantic Versioning (SemVer) `MAJOR.MINOR.PATCH`; bump type must match release impact.
- **Release cadence:** On-demand releases only after `release-governance-gate` and required specialist/CI gates pass.
- **Exceptions:** Any policy exception must be approved by a named owner and logged in `.copilot/decision-log.md` with rationale before merge/release.
