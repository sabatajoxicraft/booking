# Copilot Instructions — Recovery Baseline

## Primary Objective
Maintain one consistent governance system for recovery and M1 re-launch.

## Authoritative References
- Hierarchy authority: `.copilot/instructions/hierarchy.md`
- Trigger enforcement: `.copilot/instructions/auto-triggers.md`
- Gate docs: `.github/agents/kiss-gate.md`, `.github/agents/dry-gate.md`, `.github/agents/atomic-design-gate.md`, `.github/agents/flow-integrity-gate.md`, `.github/agents/brand-consistency-gate.md`

## Core Rules
- Prefer deterministic, minimal changes.
- Do not mark M1 complete until all task-board and gate conditions pass.
- During recovery, do not change app code under `src/` or dependencies.
