import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { KomiiError } from "./errors.js";

export type Operation = "create directory" | "create file" | "edit file";
export type ConfirmOperation = (operation: Operation, absolutePath: string) => Promise<boolean>;

export interface ChangeSummary {
  readonly created: string[];
  readonly edited: string[];
  readonly skipped: string[];
}

export function assertInsideRoot(root: string, targetPath: string): string {
  const absoluteRoot = resolve(root);
  const absoluteTarget = resolve(absoluteRoot, targetPath);
  const pathFromRoot = relative(absoluteRoot, absoluteTarget);

  if (
    isAbsolute(pathFromRoot) ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`)
  ) {
    throw new KomiiError(`Refusing to access a path outside the project root: ${targetPath}`);
  }

  return absoluteTarget;
}

async function assertNoSymlinkEscape(root: string, absoluteTarget: string): Promise<void> {
  const absoluteRoot = resolve(root);
  const canonicalRoot = await realpath(absoluteRoot);
  const targetRelativeToRoot = relative(absoluteRoot, absoluteTarget);
  let current = absoluteRoot;

  for (const segment of targetRelativeToRoot.split(sep).filter(Boolean)) {
    current = resolve(current, segment);
    let canonicalCurrent: string;
    try {
      canonicalCurrent = await realpath(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
      throw error;
    }
    const canonicalRelative = relative(canonicalRoot, canonicalCurrent);
    if (
      isAbsolute(canonicalRelative) ||
      canonicalRelative === ".." ||
      canonicalRelative.startsWith(`..${sep}`)
    ) {
      throw new KomiiError(`Refusing to access a symlink outside the project root: ${current}`);
    }
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function ensureDirectory(
  root: string,
  directoryPath: string,
  confirm: ConfirmOperation,
  summary: ChangeSummary,
): Promise<boolean> {
  const target = assertInsideRoot(root, directoryPath);
  await assertNoSymlinkEscape(root, target);
  const missing: string[] = [];
  let current = target;

  while (!await pathExists(current)) {
    missing.unshift(current);
    const parent = dirname(current);
    if (parent === current) {
      throw new KomiiError(`Cannot find an existing parent directory for ${target}`);
    }
    current = parent;
  }

  for (const directory of missing) {
    const relativePath = relative(resolve(root), directory);
    if (summary.skipped.includes(`create directory ${relativePath}`)) return false;
    if (!await confirm("create directory", directory)) {
      summary.skipped.push(`create directory ${relativePath}`);
      return false;
    }

    await assertNoSymlinkEscape(root, directory);
    await mkdir(directory);
    summary.created.push(`directory ${relativePath}`);
  }

  return true;
}

export async function writeConfirmedFile(
  root: string,
  filePath: string,
  content: string,
  confirm: ConfirmOperation,
  summary: ChangeSummary,
  expectedCurrent?: string,
): Promise<boolean> {
  const target = assertInsideRoot(root, filePath);
  await assertNoSymlinkEscape(root, target);
  const currentContent = await readFile(target, "utf8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  });

  if (currentContent === content) return true;
  if (expectedCurrent !== undefined && currentContent !== expectedCurrent) {
    throw new KomiiError(`File changed while awaiting confirmation; refusing to edit ${target}`);
  }

  const operation: Operation = currentContent === undefined ? "create file" : "edit file";
  if (!await confirm(operation, target)) {
    summary.skipped.push(`${operation} ${relative(resolve(root), target)}`);
    return false;
  }

  const latestContent = await readFile(target, "utf8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  });
  if (latestContent !== currentContent) {
    throw new KomiiError(`File changed while awaiting confirmation; refusing to edit ${target}`);
  }

  await assertNoSymlinkEscape(root, target);
  await writeFile(target, content, currentContent === undefined ? { flag: "wx" } : undefined);
  const relativePath = relative(resolve(root), target);
  if (currentContent === undefined) summary.created.push(`file ${relativePath}`);
  else summary.edited.push(`file ${relativePath}`);
  return true;
}
