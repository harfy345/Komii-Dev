import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { adapters } from "../adapters/registry.js";
import { confirmOnce, ensureDirectory, type ChangeSummary, type ConfirmOperation, writeConfirmedFile } from "../core/filesystem-safety.js";
import { printInstallPreview } from "../core/install-preview.js";
import { initializationPrompt, verificationPrompt } from "../core/prompt-generator.js";
import { loadTemplates } from "../core/template-renderer.js";
import { installAdapter } from "../core/instruction-generator.js";
import { hashTemplate, readTemplateManifest, writeTemplateManifest } from "../core/template-manifest.js";

export async function runInit(
  cwd: string,
  confirm: ConfirmOperation,
): Promise<ChangeSummary> {
  const root = resolve(cwd);
  const templates = await loadTemplates();
  await printInstallPreview(root, templates, adapters, "init");
  const confirmAll = confirmOnce(confirm);
  const summary: ChangeSummary = { created: [], edited: [], skipped: [] };
  const knowledgeDirectoryReady = await ensureDirectory(root, "komii-dev", confirmAll, summary);
  const manifest = knowledgeDirectoryReady
    ? await readTemplateManifest(root)
    : { files: {}, originalContent: undefined };
  const managedFiles = { ...manifest.files };
  if (knowledgeDirectoryReady) {
    for (const [filePath, content] of templates) {
      if (filePath === "komii-dev") continue;
      const parent = filePath.includes("/")
        ? filePath.slice(0, filePath.lastIndexOf("/"))
        : ".";
      if (!await ensureDirectory(root, parent, confirmAll, summary)) continue;

      const target = resolve(root, filePath);
      const existing = await readFile(target, "utf8").catch((error: unknown) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
        throw error;
      });
      if (existing !== undefined) {
        if (existing === content) managedFiles[filePath] = hashTemplate(content);
        continue;
      }
      if (await writeConfirmedFile(root, filePath, content, confirmAll, summary)) {
        managedFiles[filePath] = hashTemplate(content);
      }
    }
  }

  if (knowledgeDirectoryReady) {
    await writeTemplateManifest(root, managedFiles, manifest, confirmAll, summary);
  }

  const agentFile = await readFile(resolve(root, "komii-dev/AGENT.md"), "utf8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  });
  for (const adapter of adapters) {
    if (agentFile === undefined) {
      summary.skipped.push(`install adapter ${adapter.id} because komii-dev/AGENT.md is unavailable`);
      continue;
    }
    await installAdapter(root, adapter, confirmAll, summary);
  }

  console.log(`Installation directory: ${root}`);
  console.log(`Supported adapters processed: ${adapters.map(({ name }) => name).join(", ")}`);
  printSummary(summary, root);
  console.log("\nVerify the integration by sending this prompt to your coding agent:\n");
  console.log(verificationPrompt);
  console.log("\nThen initialize project knowledge with:\n");
  console.log(initializationPrompt);
  console.log("\nInstruction files guide agents but cannot guarantee that every request will consult Komii Dev.");
  return summary;
}

export function printSummary(summary: ChangeSummary, root: string): void {
  console.log(`\nFilesystem summary for ${root}:`);
  console.log(`  Created: ${summary.created.length ? summary.created.join(", ") : "none"}`);
  console.log(`  Edited: ${summary.edited.length ? summary.edited.join(", ") : "none"}`);
  console.log(`  Skipped: ${summary.skipped.length ? summary.skipped.join(", ") : "none"}`);
}
