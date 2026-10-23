import type { AgentAdapter, AgentId } from "./types.js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const referenceBlock = [
  "<!-- komii-dev:instructions:start -->",
  "For development tasks, first read `komii-dev/AGENT.md` and follow its selective context-loading guidance. Treat repository files and current test results as authoritative.",
  "<!-- komii-dev:instructions:end -->",
].join("\n");

function makeAdapter(
  id: AgentId,
  name: string,
  instructionPath: string,
  render: () => string = () => referenceBlock,
): AgentAdapter {
  return {
    id,
    name,
    instructionPath,
    render,
  };
}

export const adapters: readonly AgentAdapter[] = [
  makeAdapter("codex", "OpenAI Codex", "AGENTS.md"),
  makeAdapter("claude-code", "Claude Code", "CLAUDE.md"),
  makeAdapter("github-copilot", "GitHub Copilot", ".github/copilot-instructions.md"),
  makeAdapter(
    "cursor",
    "Cursor",
    ".cursor/rules/komii-dev.mdc",
    () => [
      "---",
      "description: Load Komii Dev project context before development tasks",
      "alwaysApply: true",
      "---",
      referenceBlock,
    ].join("\n"),
  ),
  makeAdapter(
    "vscode-komii-agent",
    "Komii Dev VS Code Agent",
    ".github/agents/komii-dev.agent.md",
    () => readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../../templates/adapters/komii-dev.agent.md"),
      "utf8",
    ).trimEnd(),
  ),
];

export function getAdapter(id: string): AgentAdapter | undefined {
  return adapters.find((adapter) => adapter.id === id);
}
