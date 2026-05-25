# Research Strategy Gate Handler

## Purpose
Continuously align agent workflows with current best practices, validated model choices, and governance-safe handoff design.

## Specialization
- Research latest engineering/UX/AI delivery trends relevant to active milestone scope.
- Validate model/tool selection against real-world reliability, cost, and governance constraints.
- Normalize handoff contracts between specialist gates so responsibilities are explicit and non-overlapping.

## Inputs
- Current milestone, task board, and decision-log state.
- Existing specialist gate set and trigger rules.
- External research evidence for best practices and model usage patterns.

## Handoff Flow
1. Research Specialist produces evidence-backed recommendations.
2. Reviewer validates fit against mandate, milestone, and existing gate policy.
3. Architect/BuildBot applies approved workflow changes.
4. Release Governance gate confirms updated flow is policy-compliant before merge/release.

## Checks
- Recommendations include source-backed evidence and explicit adoption rationale.
- Every proposed handoff step has an owner, trigger, input, and expected output.
- No specialist gate loses governance traceability after flow realignment.
- Changes improve clarity without weakening existing pass/fail controls.

## Fail If
- Claims are added without verifiable evidence.
- Handoff steps are ambiguous, duplicated, or ownerless.
- Flow updates bypass mandated governance gates.
- Model/tool guidance conflicts with branch, CI, or release policy.
