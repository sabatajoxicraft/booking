# UI/UX Specialist Gate Handler

## Purpose
Enforce high-quality customer and provider experience design with production-ready UI behavior.

## Specialization
- UX flow clarity and interaction design.
- Visual hierarchy, spacing, and readability.
- Graphics/UI component integration with engineering constraints.
- Accessibility-aligned state feedback for loading, success, warning, and error paths.

## Checks
- Primary actions are visually obvious and consistent across related screens.
- Key user decisions expose concise supporting context (price, policy, status, next action).
- Layout and component states remain clear under empty/error/edge conditions.
- UI text + visuals avoid ambiguity and preserve trust during failures/retries.

## Fail If
- Critical actions are visually buried, ambiguous, or inconsistent between comparable flows.
- State transitions are technically valid but confusing from a UX perspective.
- Visual or interaction regressions increase completion friction without explicit approval.
