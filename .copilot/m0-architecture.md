# M0 Architecture (Recovery Re-baseline)

## Architectural Intent
Define the operational structure that keeps product flow, brand rules, and delivery gates aligned.

## Core Architecture Layers
1. **Experience layer:** Atomic Design composition and brand-consistent UX.
2. **Flow layer:** Booking-state transitions with explicit valid actions.
3. **Governance layer:** Instruction hierarchy, trigger matrix, and specialist gate handlers.

## Single-Source Control
- Product truth: `.copilot/prd.md`
- Milestone truth: `.copilot/current-milestone.md`
- Execution truth: `.copilot/m1-tasks.md`
- Enforcement truth: `.copilot/instructions/hierarchy.md`, `.copilot/instructions/phases.md`, `.copilot/instructions/auto-triggers.md`, `.copilot/instructions/coding-standards.md`, `.copilot/instructions/scaffolding-rules.md`, `.github/agents/kiss-gate.md`, `.github/agents/dry-gate.md`, `.github/agents/atomic-design-gate.md`, `.github/agents/flow-integrity-gate.md`, `.github/agents/brand-consistency-gate.md`

## Fast-Track Delivery Topology
- **Golden path stream:** mandatory first implementation sequence.
- **Parallel lane streams:** enabled only after golden path baseline acceptance.
- **Convergence gate:** all specialist gate handlers must report pass.
