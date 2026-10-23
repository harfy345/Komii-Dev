import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { KomiiError } from "./errors.js";
import { type ChangeSummary, type ConfirmOperation, writeConfirmedFile } from "./filesystem-safety.js";

export const templateManifestPath = "komii-dev/.komii-dev-manifest.json";

export interface TemplateManifest {
  readonly files: Record<string, string>;
  readonly originalContent: string | undefined;
}

export function hashTemplate(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function readTemplateManifest(root: string): Promise<TemplateManifest> {
  const originalContent = await readFile(resolve(root, templateManifestPath), "utf8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  });
  if (originalContent === undefined) return { files: {}, originalContent };

  let parsed: unknown;
  try {
    parsed = JSON.parse(originalContent);
  } catch (error) {
    throw new KomiiError(`Invalid Komii Dev template manifest at ${templateManifestPath}: ${String(error)}`);
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    parsed.version !== 1 ||
    !("files" in parsed) ||
    typeof parsed.files !== "object" ||
    parsed.files === null ||
    Array.isArray(parsed.files) ||
    Object.values(parsed.files).some((hash) => typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash))
  ) {
    throw new KomiiError(`Invalid Komii Dev template manifest at ${templateManifestPath}.`);
  }

  const files: Record<string, string> = {};
  for (const [path, hash] of Object.entries(parsed.files)) {
    if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) {
      throw new KomiiError(`Invalid template hash for ${path} in ${templateManifestPath}.`);
    }
    files[path] = hash;
  }

  return {
    files,
    originalContent,
  };
}

export async function writeTemplateManifest(
  root: string,
  files: Record<string, string>,
  manifest: TemplateManifest,
  confirm: ConfirmOperation,
  summary: ChangeSummary,
): Promise<void> {
  const content = `${JSON.stringify({ version: 1, files }, null, 2)}\n`;
  if (content === manifest.originalContent) return;
  await writeConfirmedFile(
    root,
    templateManifestPath,
    content,
    confirm,
    summary,
    manifest.originalContent,
  );
}
