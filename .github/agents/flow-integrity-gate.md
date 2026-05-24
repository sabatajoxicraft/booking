# Flow Integrity Gate Handler

## Purpose
Protect booking-state coherence from discovery through confirmation and closure.

## Checks
- States and transitions are explicit.
- Every non-terminal state has a valid next action.
- Terminal states are immutable.

## Fail If
- Hidden transitions appear.
- Dead ends exist without recovery path.
- Conflicting transition rules exist between PRD and task board.
