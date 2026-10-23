import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { adapters } from "../adapters/registry.js";
import { installAdapter } from "../core/instruction-generator.js";
import { ensureDirectory, type ChangeSummary, type ConfirmOperation, writeConfirmedFile } from "../core/filesystem-safety.js";
import { loadTemplates } from "../core/template-renderer.js";
import { hashTemplate, readTemplateManifest, writeTemplateManifest } from "../core/template-manifest.js";

export async function runUpdate(cwd: string, confirm: ConfirmOperation): Promise<ChangeSummary> {
  const root = resolve(cwd);
  const templates = await loadTemplates();
  const summary: ChangeSummary = { created: [], edited: [], skipped: [] };
  const directory = resolve(root, "komii-dev");
  let directoryExists = true;
  try {
    await access(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") directoryExists = false;
    else throw error;
  }
  if (!directoryExists && !await ensureDirectory(root, "komii-dev", confirm, summary)) {
    console.log("Update stopped because komii-dev/ was not approved for creation.");
    return summary;
  }
  const manifest = await readTemplateManifest(root);
  const managedFiles = { ...manifest.files };

  for (const [filePath, content] of templates) {
    const parent = filePath.slice(0, filePath.lastIndexOf("/"));
    if (!await ensureDirectory(root, parent, confirm, summary)) continue;
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
      if (await writeConfirmedFile(root, filePath, content, confirm, summary, existing)) {
        managedFiles[filePath] = hashTemplate(content);
      }
      continue;
    }
    if (await writeConfirmedFile(root, filePath, content, confirm, summary)) {
      managedFiles[filePath] = hashTemplate(content);
    }
  }

  await writeTemplateManifest(root, managedFiles, manifest, confirm, summary);

  const agentFile = await readFile(resolve(root, "komii-dev/AGENT.md"), "utf8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  });
  if (agentFile !== undefined) {
    for (const adapter of adapters) {
      await installAdapter(root, adapter, confirm, summary, "update");
    }
  } else {
    summary.skipped.push("update adapters because komii-dev/AGENT.md is unavailable");
  }

  console.log("Updated unchanged managed templates and adapter references, and added missing starter files. Customized files were preserved.");
  console.log(`Created ${summary.created.length} path(s), edited ${summary.edited.length}, skipped ${summary.skipped.length}.`);
  return summary;
}
