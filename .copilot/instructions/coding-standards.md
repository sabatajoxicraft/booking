# Coding Standards (Gate-Mapped)

## KISS (Simplicity)
- **Check:** each flow step has one clear responsibility and one primary path.
- **Failure condition:** multiple competing paths without explicit reason.

## DRY (No unmanaged duplication)
- **Check:** repeated logic/content is abstracted or intentionally documented once.
- **Failure condition:** duplicate blocks diverge or require mirrored edits.

## Atomic Design (UI composition discipline)
- **Check:** `src/components/ui/*` remains primitive UI substrate aligned to atom-level building blocks; molecules/organisms/templates/pages may import these primitives.
- **Failure condition:** higher-order components or page-level behavior are authored under `src/components/ui`, or docs define `ui` primitives outside atom-level/shared-primitive semantics.

## UI/UX Specialist (experience integrity)
- **Check:** critical actions remain visually clear, state feedback is explicit, and key decision context is available at the point of action.
- **Failure condition:** visual ambiguity, hidden primary actions, or interaction regressions that increase completion friction.

## Flow Integrity
- **Check:** all booking states expose valid next actions and terminal-state rules.
- **Failure condition:** dead-end states, hidden transitions, or mutable terminal states.

## Brand Consistency
- **Check:** language and interaction tone remain clear, calm, and trustworthy.
- **Failure condition:** conflicting tone, unclear CTA text, or missing policy clarity.

## Gate Policy
Any failed check blocks progression until corrected or explicitly accepted in the decision log.
