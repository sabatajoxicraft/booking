# Release Governance Gate Handler

## Purpose
Protect CI/CD, branch policy, release readiness, and version integrity before merge or release.

## Inputs
- Current milestone state, task board status, and latest decision-log entries.
- Workflow evidence (latest CI/CD runs and required checks).
- Branch context (source branch, target branch, and release-branch policy).
- Version evidence (package/app version diff and bump rationale).
- Release notes/changelog entries and artifact provenance evidence.

## Triggers
- Any workflow, branch-policy, release, or versioning change.
- Any merge-to-main candidate.
- Any release branch creation or release cut candidate.

## Outputs
- Gate pass/fail report with explicit evidence links.
- Required corrective actions with owners.
- Release checklist status (ready/not-ready).

## Fail Criteria
- CI is not green for required checks.
- Release branch is unauthorized or policy-noncompliant.
- Version bump is missing, invalid, or inconsistent with scope.
- Release notes or changelog evidence is missing.
- Artifact provenance evidence is missing.
- Identical CI failure repeats without strategy change.
