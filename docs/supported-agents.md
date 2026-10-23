# Supported agent instruction files

| Agent | Project instruction path | Adapter id |
|---|---|---|
| OpenAI Codex | `AGENTS.md` | `codex` |
| Claude Code | `CLAUDE.md` | `claude-code` |
| GitHub Copilot | `.github/copilot-instructions.md` | `github-copilot` |
| Cursor | `.cursor/rules/komii-dev.mdc` | `cursor` |
| VS Code custom agent | `.github/agents/komii-dev.agent.md` | `vscode-komii-agent` |

The CLI installs every supported adapter; it does not attempt to identify the user's editor, agent, or model. It shows the full plan and asks once before making changes. After approval, it appends a marked reference to existing instruction files without replacing existing content, and avoids duplicate references. The Cursor rule uses `.mdc` frontmatter with `alwaysApply: true`.

The VS Code custom agent has `user-invocable: true`, so it appears in the agent picker as **Komii Dev**. Its prompt asks the currently selected model to read `komii-dev/AGENT.md` before each request. The agent does not declare a `model` field, so VS Code can use the model selected by the user. The agent remains selected until the user switches agents. These are model instructions, not hard runtime enforcement.
