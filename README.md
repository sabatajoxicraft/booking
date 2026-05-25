# Booking Platform

[![CI](https://github.com/sabatajoxicraft/booking/actions/workflows/test-lint.yml/badge.svg)](https://github.com/sabatajoxicraft/booking/actions/workflows/test-lint.yml)

## Product Overview
Booking is a brand-led booking experience focused on **clarity, confidence, and completion** for both customers and providers.

### Brand Identity
- **Tone:** calm, clear, trustworthy.
- **Promise:** users always know the next step.
- **UX principle:** reduce decision friction without hiding critical details.

## Canonical Booking Journey
Canonical booking steps are defined only in `.copilot/prd.md` under **Canonical Booking Process Flow** and must be used verbatim.

## Fast-Track Execution Model
- **Golden path first:** deliver the end-to-end happy path defined in `.copilot/prd.md` (**Canonical Booking Process Flow**) with strict gate checks.
- **Parallel lanes after golden path:**
  - Brand System lane
  - Provider Operations lane
  - Resilience & Edge-Case lane
- Every lane must pass DRY/KISS/Atomic + Flow Integrity + Brand Consistency gates.

## Quality Gates
- Standards: `.copilot/instructions/coding-standards.md`
- Trigger matrix: `.copilot/instructions/auto-triggers.md`
- Specialist handlers: `.github/agents/kiss-gate.md`, `.github/agents/dry-gate.md`, `.github/agents/atomic-design-gate.md`, `.github/agents/flow-integrity-gate.md`, `.github/agents/brand-consistency-gate.md`

## Quick Start
```bash
npm install
npm run dev
npm run lint
npm run build
```

## Governance Sources
- Milestone state: `.copilot/current-milestone.md`
- Active execution state: `.copilot/session-state.md`
- Product truth: `.copilot/prd.md`
