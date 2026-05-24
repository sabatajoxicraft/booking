# Product Requirements Document (Recovery Baseline)

## Product Direction
A coherent, brand-consistent booking platform with a single canonical user journey and operationally reliable state transitions.

## Brand System Requirements
- Clear, trustworthy language at each booking step.
- Consistent visual hierarchy driven by Atomic Design components.
- Transparent pricing/policy presentation before commitment.

## Canonical Booking Process Flow
1. Service discovery
2. Slot selection
3. Customer details capture
4. Price/policy confirmation
5. Booking commit
6. Confirmation and post-booking status handling

### Flow Integrity Rules
- No hidden transitions between states.
- Every state exposes next valid action.
- Terminal states are explicit and immutable.

## Fresha-Inspired Lessons Applied
- Prioritize completion speed on the main flow before edge-case expansion.
- Keep provider availability and customer intent tightly synchronized.
- Use clear status language to reduce support load.
- Avoid dead-end screens; always provide a safe next action.

## Fast-Track Strategy
- **Phase A (Golden path):** Implement complete happy path first.
- **Phase B (Parallel lanes):** Brand System, Provider Ops, and Resilience lanes run concurrently.
- **Phase C (Convergence):** Merge lanes only after all gates pass.

## Success Criteria
- Golden path is complete end-to-end.
- Parallel lanes pass DRY/KISS/Atomic + Flow + Brand gates.
- Governance docs and instructions remain internally consistent.
