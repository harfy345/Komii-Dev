# Debug an issue

## Purpose
Find and correct the root cause of a reproducible defect.

## When to use
Use when behavior differs from expectations or a check reports a failure.

## Required initial context
Read `komii-dev/AGENT.md`, then load relevant map, architecture, state, source, and test context.

## Workflow
1. Capture the exact observed behavior, expected behavior, and reproduction.
2. Trace the affected call path and inspect nearby tests and error handling.
3. Form a falsifiable cause, then verify it with a focused test or diagnostic.
4. Fix the root cause and add regression coverage where practical.
5. Run focused checks and distinguish pre-existing failures from regressions.
6. Review the changes and summarize evidence and remaining uncertainty.

## Validation
Never report a diagnosis as confirmed without supporting runtime, test, or code evidence.

## Knowledge updates
Update project knowledge only if the verified findings affect maintained architecture or current state.
