import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgentAdapter } from "../adapters/types.js";
import { hashTemplate, readTemplateManifest, templateManifestPath } from "./template-manifest.js";

type PreviewMode = "init" | "update";

async function readExisting(root: string, path: string): Promise<string | undefined> {
  return readFile(resolve(root, path), "utf8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  });
}

export async function printInstallPreview(
  root: string,
  templates: ReadonlyMap<string, string>,
  adapters: readonly AgentAdapter[],
  mode: PreviewMode,
): Promise<void> {
  const manifest = await readTemplateManifest(root);
  const managedFiles = { ...manifest.files };
  const changes: Array<{ path: string; description: string; marker: string }> = [];

  for (const [path, content] of [...templates].sort(([left], [right]) => left.localeCompare(right))) {
    const existing = await readExisting(root, path);
    if (existing === undefined) {
      changes.push({ path, description: "create knowledge file", marker: "+" });
      managedFiles[path] = hashTemplate(content);
    } else if (mode === "update" && managedFiles[path] === hashTemplate(existing) && existing !== content) {
      changes.push({ path, description: "refresh unchanged managed template", marker: "~" });
      managedFiles[path] = hashTemplate(content);
    } else if (existing === content) {
      managedFiles[path] = hashTemplate(content);
      changes.push({
        path,
        description: mode === "update" ? "already current" : "already installed",
        marker: "✓",
      });
    } else {
      changes.push({ path, description: "preserve existing knowledge file", marker: "✓" });
    }
  }

  for (const adapter of adapters) {
    const existing = await readExisting(root, adapter.instructionPath);
    if (existing === undefined) {
      changes.push({ path: adapter.instructionPath, description: `create ${adapter.name} instructions`, marker: "+" });
    } else if (existing.includes("komii-dev/AGENT.md")) {
      const hasManagedBlock = existing.includes("komii-dev:instructions:start");
      changes.push({
        path: adapter.instructionPath,
        description: mode === "update" && hasManagedBlock
          ? `refresh managed ${adapter.name} instructions`
          : `${adapter.name} instructions already present`,
        marker: mode === "update" && hasManagedBlock ? "~" : "✓",
      });
    } else {
      changes.push({ path: adapter.instructionPath, description: `append ${adapter.name} instructions`, marker: "↳" });
    }
  }

  const manifestContent = `${JSON.stringify({ version: 1, files: managedFiles }, null, 2)}\n`;
  if (manifest.originalContent === undefined) {
    changes.push({ path: templateManifestPath, description: "create managed-template metadata", marker: "+" });
  } else if (manifestContent !== manifest.originalContent) {
    changes.push({ path: templateManifestPath, description: "update managed-template metadata", marker: "~" });
  }

  console.log(`\nKomii Dev ${mode} plan for ${root}:`);
  for (const change of changes) {
    console.log(`  ${change.marker} ${change.path.padEnd(48)} ${change.description}`);
  }
  if (mode === "init") {
    console.log("\nExisting knowledge files are preserved. Existing instruction files are appended to, not replaced.");
  } else {
    console.log("\nCustomized knowledge files and unrelated instruction text are preserved. Only unchanged managed templates and Komii Dev's marked instruction blocks can be refreshed.");
  }
  console.log("Required folders are included. One confirmation will approve or cancel the entire plan.");
}
