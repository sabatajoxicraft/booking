# Auto Triggers

| Trigger Condition | Required Gate/Action | Owner | Priority |
|---|---|---|---|
| Over-complex solution or unnecessary branching | Run KISS gate (`.github/agents/kiss-gate.md`) | Reviewer | P0 |
| Duplicate logic/content appears in active scope | Run DRY gate (`.github/agents/dry-gate.md`) | Reviewer | P0 |
| UI structure violates atomic composition boundaries | Run Atomic Design gate (`.github/agents/atomic-design-gate.md`) | Architect + Reviewer | P0 |
| Booking-state transitions become ambiguous/inconsistent | Run Flow Integrity gate (`.github/agents/flow-integrity-gate.md`) | Reviewer | P0 |
| User-facing messaging drifts from brand tone/promise | Run Brand Consistency gate (`.github/agents/brand-consistency-gate.md`) | Reviewer | P0 |
| Workflow/branch/release/version changes or merge-to-main candidate | Run Release Governance gate (`.github/agents/release-governance-gate.md`) | BuildBot + Reviewer | P0 |
| Gate evidence artifact is missing or invalid (`.copilot/gate-evidence.json`) | Regenerate/repair artifact and run CI gate-evidence validation before retrying | BuildBot | P0 |
| Build/lint fails | Invoke `build-failure-triage` skill before retrying | BuildBot | P0 |
| Same failure repeats (2nd occurrence) | Invoke root-cause forensics skill and change strategy | OVERSEER | P0 |
