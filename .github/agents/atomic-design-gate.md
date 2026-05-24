# Atomic Design Gate Handler

## Purpose
Enforce clean atomic composition boundaries.

## Checks
- `src/components/ui/*` is treated as primitive UI substrate mapped to atom-level/shared primitive building blocks.
- Molecules/organisms/templates/pages may import `src/components/ui/*` primitives.
- Higher-order components are authored outside `src/components/ui`.

## Fail If
- Any component in `src/components/ui/*` contains molecule/organism/template/page responsibilities.
- Docs/instructions disagree on whether `src/components/ui/*` is primitive atom-level/shared primitive substrate.
