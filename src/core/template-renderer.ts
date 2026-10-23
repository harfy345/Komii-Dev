import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const templateRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../templates/komii-dev");

async function collectFiles(directory: string, root = directory): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path, root));
    else if (entry.isFile()) files.push(relative(root, path).split(sep).join("/"));
  }
  return files;
}

export async function loadTemplates(): Promise<Map<string, string>> {
  const files = await collectFiles(templateRoot);
  const templates = new Map<string, string>();
  for (const file of files) {
    templates.set(
      `komii-dev/${file}`,
      await readFile(join(templateRoot, file), "utf8"),
    );
  }
  return templates;
}
