# Komii Dev

**Reusable, repository-local context for AI coding agents.**

[GitHub repository](https://github.com/harfy345/Komii-Dev) · [npm package](https://www.npmjs.com/package/komii-dev)

Komii Dev gives compatible coding agents a concise project entry point, architecture notes, working state, decisions, and reusable workflows. The repository remains the source of truth; these files help an agent find the relevant evidence without rediscovering every part of the codebase on every task.

## Why project context?

Large repositories contain more information than most individual tasks need. Re-reading everything can consume time and context while still making it easy to miss conventions or prior decisions. Komii Dev provides a small index and selective guidance. It does not promise token savings, replace code inspection, or guarantee that an agent will follow its instructions.

## How it works

1. Initialize `komii-dev/` and instruction entry points for all supported agents.
2. Ask the AI coding agent you choose to verify the instructions and initialize the knowledge files from repository evidence.
3. For later tasks, the agent reads the entry point and loads only relevant notes, skills, and source files.
4. At the end of each request that changes the project, the agent checks whether the change made any Komii Dev knowledge stale and updates only the affected files. Later requests can then use the refreshed context.

The CLI does not identify which AI agent you use, analyze your repository, call a model provider, or upload project code. It installs all supported instruction files. The AI model available through your coding agent handles project analysis and initializes the knowledge files; use whichever model you already use with that agent. The CLI imposes no model choice.

This is an instruction to the selected coding agent, not automatic file monitoring: it updates context based on work it performs when permitted to edit those files. Changes made outside that agent are not automatically detected, and agent behavior can vary.

## Requirements and supported agents

- Node.js 20.19 or newer.
- Codex: root `AGENTS.md`.
- Claude Code: root `CLAUDE.md`.
- GitHub Copilot: `.github/copilot-instructions.md`.
- Cursor: `.cursor/rules/komii-dev.mdc`.
- VS Code agent picker: `.github/agents/komii-dev.agent.md`.

The CLI installs all five instruction files without trying to detect your IDE, agent, model, language, or project structure. Instruction files guide agents; each agent and model may apply instructions differently.

## Install with the CLI

From the project you want to initialize:

```sh
npx komii-dev init
```

Run the command from the root of the project where you want Komii Dev installed. The CLI operates in the current directory and does not search for a repository root.

Before changing anything, the CLI shows a visual plan of the files it will create, preserve, append to, or refresh, then asks for one confirmation for the whole command. No changes are made unless you approve. It checks the target paths first: `init` preserves existing project knowledge files, and existing agent instruction files are kept intact with Komii Dev instructions appended at the end after approval. Komii Dev does not delete files. Required folders are created only as part of the approved plan. In noninteractive execution, changes are refused because confirmation is unavailable.

Then send the printed verification prompt to the AI coding agent you use. Ask that agent to initialize the project knowledge from repository evidence. The CLI does not choose the model or perform that analysis. Review generated project knowledge before relying on it.

### Use Komii Dev from the VS Code agent picker

After installation, open VS Code Chat's agent picker and select **Komii Dev**. The custom agent tells the selected model to read `komii-dev/AGENT.md` before handling each request and then load only relevant project context. It does not select or lock a model; use the model you prefer in VS Code.

![Komii Dev selected in the VS Code agent picker](https://raw.githubusercontent.com/harfy345/Komii-Dev/master/assets/vscode-agent-picker.png)

The custom agent remains active for the conversation until you switch agents. To have Komii Dev's instructions guide a conversation, select it in the picker; installing the file does not switch your active agent automatically. As with other agent instructions, the prompt guides model behavior and is not a hard runtime guarantee. See the [VS Code custom agents documentation](https://code.visualstudio.com/docs/agent-customization/custom-agents) for details.

## Manual and agent-assisted installation

For a manual installation, obtain this repository from its official GitHub source, copy the contents of `templates/komii-dev/` into your project's `komii-dev/` directory, and install all five instruction files from `templates/adapters/` at their documented paths. Preserve existing files, append instructions rather than replacing existing content, and get one approval for the complete change list before making changes. Verify the result with `komii-dev doctor`.

You can also ask an agent with access to the official Komii Dev repository and permission to modify project files:

> Install Komii Dev into this repository using the official Komii Dev repository as the source. Read its installation instructions, copy the required templates into this project, install all five supported agent instruction files, and preserve all existing files. Do not delete or replace existing content; append instruction references to existing files. First show me the complete list of planned changes and ask once for approval before making any changes, then verify the resulting configuration.

An agent needs access to the source and permission to change the project; mentioning its name alone does not install or configure anything. Manual and CLI installation should yield equivalent initial knowledge files.

## Commands

```sh
komii-dev init
komii-dev update
komii-dev doctor
```

- `init` installs starter knowledge and all supported instruction references; existing knowledge files are preserved.
- `update` adds missing starter files, refreshes unchanged CLI-managed templates, and refreshes only Komii Dev's marked instruction-reference blocks. It preserves customized knowledge and unrelated instruction text.
- `doctor` checks expected knowledge files and all supported instruction references. It cannot inspect how an external agent applies instructions.

`init` and `update` each show a complete change plan and ask for one confirmation before writing. `init` preserves existing knowledge files and appends to existing instruction files; it does not delete files. `update` may refresh unchanged CLI-managed templates and Komii Dev's own marked instruction blocks, while preserving user-customized content.

## Installed knowledge layout

```text
komii-dev/
├── AGENT.md
├── project-map.md
├── architecture.md
├── conventions.md
├── state.md
├── decisions.md
└── skills/
    ├── explore-project/SKILL.md
    ├── implement-feature/SKILL.md
    └── debug/SKILL.md
```

Agent instruction files are installed at the project root or under `.github/agents/`, `.github/`, and `.cursor/rules/`. Select **Komii Dev** in VS Code's agent picker to use its project-context workflow.

- `AGENT.md`: concise entry point and selective-loading instructions.
- `project-map.md`: important directories, entry points, and tests.
- `architecture.md`: verified components, boundaries, and data flows.
- `conventions.md`: demonstrated code, test, and tooling practices.
- `state.md`: current task, blockers, and recent checks—not a transcript.
- `decisions.md`: significant decisions with evidence and rationale.
- `skills/`: selectively loaded workflows to explore, implement, or debug.
- `.komii-dev-manifest.json`: internal hashes used to distinguish unchanged CLI-managed templates from user-edited files during updates.

## Security and privacy

Initialization does not require an API key and the CLI makes no model-provider API calls. It does not scan the project or execute project scripts. Review any files before approving changes. The external coding agent may transmit or retain repository content according to its own service and settings.

## Coming soon

New skills and new features are coming soon. Follow the project on GitHub and check the npm package for upcoming releases.

Komii Dev keeps its CLI focused on installing, updating, and checking its files. Your chosen AI coding agent and model initialize project knowledge by inspecting the repository. Future releases will add more skills and features while continuing to keep project analysis with the AI tool you choose.

## Development

```sh
npm install
npm run lint
npm run typecheck
npm test
npm run build
node dist/src/cli.js --help
```

See [docs/contributing.md](docs/contributing.md) for contribution notes.

## License

Komii Dev is licensed under the [MIT License](./LICENSE).
