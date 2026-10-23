import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { adapters } from "../adapters/registry.js";
import { installAdapter } from "../core/instruction-generator.js";
import { confirmOnce, ensureDirectory, type ChangeSummary, type ConfirmOperation, writeConfirmedFile } from "../core/filesystem-safety.js";
import { printInstallPreview } from "../core/install-preview.js";
import { loadTemplates } from "../core/template-renderer.js";
import { hashTemplate, readTemplateManifest, writeTemplateManifest } from "../core/template-manifest.js";

export async function runUpdate(cwd: string, confirm: ConfirmOperation): Promise<ChangeSummary> {
  const root = resolve(cwd);
  const templates = await loadTemplates();
  await printInstallPreview(root, templates, adapters, "update");
  const confirmAll = confirmOnce(confirm);
  const summary: ChangeSummary = { created: [], edited: [], skipped: [] };
  const directory = resolve(root, "komii-dev");
  let directoryExists = true;
  try {
    await access(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") directoryExists = false;
    else throw error;
  }
  if (!directoryExists && !await ensureDirectory(root, "komii-dev", confirmAll, summary)) {
    console.log("Update stopped because komii-dev/ was not approved for creation.");
    return summary;
  }
  const manifest = await readTemplateManifest(root);
  const managedFiles = { ...manifest.files };

  for (const [filePath, content] of templates) {
    const parent = filePath.slice(0, filePath.lastIndexOf("/"));
    if (!await ensureDirectory(root, parent, confirmAll, summary)) continue;
    const existing = await readFile(resolve(root, filePath), "utf8").catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    });
    if (existing !== undefined) {
      const currentHash = hashTemplate(existing);
      if (existing === content) {
        managedFiles[filePath] = hashTemplate(content);
        continue;
      }
      if (managedFiles[filePath] !== currentHash) {
        console.log(`Preserving customized file: ${filePath}`);
        summary.skipped.push(`preserve customized file ${filePath}`);
        continue;
      }
      console.log(`Update preview: refresh unchanged managed template ${filePath}.`);
      if (await writeConfirmedFile(root, filePath, content, confirmAll, summary, existing)) {
        managedFiles[filePath] = hashTemplate(content);
      }
      continue;
    }
    if (await writeConfirmedFile(root, filePath, content, confirmAll, summary)) {
      managedFiles[filePath] = hashTemplate(content);
    }
  }

  await writeTemplateManifest(root, managedFiles, manifest, confirmAll, summary);

  const agentFile = await readFile(resolve(root, "komii-dev/AGENT.md"), "utf8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  });
  if (agentFile !== undefined) {
    for (const adapter of adapters) {
      await installAdapter(root, adapter, confirmAll, summary, "update");
    }
  } else {
    summary.skipped.push("update adapters because komii-dev/AGENT.md is unavailable");
  }

  console.log("Updated unchanged managed templates and adapter references, and added missing starter files. Customized files were preserved.");
  console.log(`Created ${summary.created.length} path(s), edited ${summary.edited.length}, skipped ${summary.skipped.length}.`);
  return summary;
}
