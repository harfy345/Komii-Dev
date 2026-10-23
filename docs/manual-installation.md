# Manual installation

1. Obtain the official Komii Dev repository from its GitHub source.
2. Copy `templates/komii-dev/` into the target repository as `komii-dev/`.
3. Install all five instruction templates from `templates/adapters/` at the paths shown in `docs/supported-agents.md`.
4. In VS Code, select **Komii Dev** in the agent picker to use its project-context instructions with your selected model.
5. Preserve existing content and ask before creating or editing any file or directory.
6. Run `komii-dev doctor`, then ask the AI coding agent and model of your choice to verify the setup and initialize project knowledge.

Agent-assisted installation requires access to the official source and permission to modify files. Ask the agent to verify all resulting paths and preserve existing user content.
