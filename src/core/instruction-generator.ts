import { readFile } from "node:fs/promises";
import { assertInsideRoot, type ChangeSummary, type ConfirmOperation, ensureDirectory, writeConfirmedFile } from "./filesystem-safety.js";
import type { AgentAdapter } from "../adapters/types.js";

const referenceMarker = "komii-dev:instructions:start";
const referenceEndMarker = "komii-dev:instructions:end";

function mergeInstructions(existing: string, generated: string, adapterId: AgentAdapter["id"]): string {
  if (existing.includes(referenceMarker) || existing.includes("komii-dev/AGENT.md")) {
    return existing;
  }
  const contentToAppend = adapterId === "cursor" || adapterId === "vscode-komii-agent"
    ? generated.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    : generated;
  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  return `${existing}${separator}${contentToAppend.trimStart()}\n`;
}

function updateManagedReference(existing: string, generated: string): string {
  const existingStart = existing.indexOf(referenceMarker);
  const existingEnd = existing.indexOf(referenceEndMarker, existingStart);
  const generatedStart = generated.indexOf(referenceMarker);
  const generatedEnd = generated.indexOf(referenceEndMarker, generatedStart);
  if (existingStart === -1 || existingEnd === -1 || generatedStart === -1 || generatedEnd === -1) {
    return existing;
  }

  const replacement = generated.slice(generatedStart, generatedEnd + referenceEndMarker.length);
  return `${existing.slice(0, existingStart)}${replacement}${existing.slice(existingEnd + referenceEndMarker.length)}`;
}

export async function installAdapter(
  root: string,
  adapter: AgentAdapter,
  confirm: ConfirmOperation,
  summary: ChangeSummary,
  mode: "install" | "update" = "install",
): Promise<void> {
  const absoluteFile = assertInsideRoot(root, adapter.instructionPath);
  const parent = adapter.instructionPath.includes("/")
    ? adapter.instructionPath.slice(0, adapter.instructionPath.lastIndexOf("/"))
    : ".";
  if (!await ensureDirectory(root, parent, confirm, summary)) return;

  const existing = await readFile(absoluteFile, "utf8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  });
  const generated = adapter.render();
  const content = existing === undefined
    ? `${generated}\n`
    : mode === "update"
      ? updateManagedReference(existing, generated)
      : mergeInstructions(existing, generated, adapter.id);
  if (existing === content) return;

  await writeConfirmedFile(root, adapter.instructionPath, content, confirm, summary, existing);
}
