# M0 Data Strategy Baseline

## Goal
Set a clear, low-risk data approach for early M1 feature delivery.

## Strategy
- Type-first domain modeling in TypeScript.
- Start with local/mock data adapters for UI and flow validation.
- Keep data-access boundary explicit so backend/API integration can replace adapters later.

## Initial Domain Focus (M1)
- Booking
- Customer
- Availability/slot

## Rules
- No backend coupling in M0/M0.5 artifacts.
- Keep data contracts centralized and reusable across components.
- Validate shape consistency at compile-time (strict TS) and avoid untyped payload flow.

## Transition Path
1. M1 task board defines domain models + mock repositories.
2. Feature slices consume repository interfaces, not concrete transport.
3. API integration is a later milestone decision, captured in decision log before adoption.
