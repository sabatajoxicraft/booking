# Production Smoke Playbook (M4-R1)

## Purpose
Record a lightweight, repeatable production smoke run after merge/release activity.

## Smoke Scope
1. **App reachability:** public site responds (`https://sabatajoxicraft.github.io/booking/`).
2. **Asset load:** built JS/CSS assets are served without 404.
3. **Core journey shell:** booking shell renders primary entry route.
4. **Governance signal:** latest required CI workflow run is green.

## Capture Process
1. Run smoke checks after merge/release.
2. Update `.copilot/.lane-audits/production-smoke-latest.json`.
3. Record each check with explicit `status` (`pass` or `fail`) and evidence note.
4. If any check fails, set top-level status to `fail` and block progression until remediated.

## Output Contract
- Artifact path: `.copilot/.lane-audits/production-smoke-latest.json`
- Required fields: `schemaVersion`, `runAt`, `environment`, `status`, `checks[]`
- Each check requires: `id`, `description`, `status`, `evidence`
