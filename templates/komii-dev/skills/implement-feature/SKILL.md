# Implement a feature

## Purpose
Deliver a scoped feature consistent with the repository's established architecture and practices.

## When to use
Use for new behavior or a meaningful enhancement.

## Required initial context
Read `komii-dev/AGENT.md`, the relevant project map and conventions, applicable architecture notes, and task-specific source/tests.

## Workflow
1. Confirm the requested behavior, boundaries, and relevant existing patterns.
2. Inspect callers, tests, and configuration before editing.
3. Make the smallest complete change, preserving unrelated user work.
4. Add or update focused tests for observable behavior.
5. Run the narrowest relevant checks and report failures accurately.
6. Review the final diff for unintended changes.

## Validation
Use repository-provided test, type-check, and build commands as appropriate. Do not claim checks passed unless run.

## Knowledge updates
Update architecture, map, conventions, decisions, or state only when the feature makes their verified content materially stale.
