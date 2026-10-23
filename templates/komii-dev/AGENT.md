# Komii Dev project context

Komii Dev is a lightweight, repository-local guide for AI coding agents. This directory is an index and memory aid; repository source, configuration, and current test results are authoritative.

## Start here

Before a development task, read this file. Then load only the context that matches the task:

- Use `project-map.md` to locate relevant modules and entry points.
- Use `architecture.md` for component boundaries and important data flows.
- Use `conventions.md` for project-specific implementation and validation practices.
- Use `state.md` for current work and recent verified checks.
- Use `decisions.md` when a past architectural decision affects the task.
- Load a skill from `skills/` only when its workflow matches the task.

Inspect the actual source files and tests before relying on summaries. Search for additional context when the map is insufficient. Confirm potentially stale facts against current code and configuration.

## Initialize and maintain this knowledge

To initialize, inspect manifests, project configuration, representative source files, tests, and relevant CI or API/database definitions. Summarize only verified facts, mark uncertainty, and do not infer missing architecture. Avoid reading every file in a large repository.

After meaningful changes, update only the affected knowledge files. Keep `state.md` focused on active work, blockers, and checks with dates or commit context; do not use it as a conversation transcript. Record decisions only when their rationale is evidenced. Ask before creating or editing files, preserve user content, and report what could not be verified.

## Context discipline

Do not reread every document here for every request. Start with the smallest relevant set, then expand exploration when evidence is incomplete. Never let these notes override the repository or conceal uncertainty.
