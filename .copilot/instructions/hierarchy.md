# Instruction Hierarchy

This file is the authoritative source for instruction hierarchy and conflict resolution order.

## Single-Source Hierarchy
1. Mandate (`.copilot/mandate.md`) defines mission and non-negotiables.
2. Milestone (`.copilot/current-milestone.md`) defines active phase truth.
3. Session (`.copilot/session-state.md`) defines immediate execution state.
4. Product + architecture (`.copilot/prd.md`, `.copilot/m0-architecture.md`) define functional direction.
5. Task board (`.copilot/m1-tasks.md`) defines executable work order.
6. Instruction modules (`.copilot/instructions/hierarchy.md`, `.copilot/instructions/phases.md`, `.copilot/instructions/auto-triggers.md`, `.copilot/instructions/coding-standards.md`, `.copilot/instructions/scaffolding-rules.md`) define enforcement mechanics.
7. Specialist gates (`.github/agents/kiss-gate.md`, `.github/agents/dry-gate.md`, `.github/agents/atomic-design-gate.md`, `.github/agents/flow-integrity-gate.md`, `.github/agents/brand-consistency-gate.md`, `.github/agents/release-governance-gate.md`) define pass/fail checks.

## Conflict Rule
If two files conflict, resolve upward using this hierarchy and update lower-level docs.
