export type AgentId = "codex" | "claude-code" | "github-copilot" | "cursor" | "vscode-komii-agent";

export interface AgentAdapter {
  readonly id: AgentId;
  readonly name: string;
  readonly instructionPath: string;
  render(): string;
}
