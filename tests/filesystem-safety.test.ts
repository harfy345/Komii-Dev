import { mkdtemp, readFile, rm, stat, symlink } from "node:fs/promises";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { assertInsideRoot, ensureDirectory, writeConfirmedFile, type ChangeSummary } from "../src/core/filesystem-safety.js";

const temporaryDirectories: string[] = [];

async function createRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "komii-dev-test-"));
  temporaryDirectories.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("filesystem safety", () => {
  it("rejects paths outside the project root", async () => {
    const root = await createRoot();
    assert.throws(() => assertInsideRoot(root, "../outside.txt"), /outside the project root/);
  });

  it("rejects existing symlinks that escape the project root", async (context) => {
    const root = await createRoot();
    const outside = await createRoot();
    try {
      await symlink(outside, join(root, "linked"), "junction");
    } catch (error) {
      if (["EPERM", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "")) {
        context.skip("Symlink creation is not permitted in this environment.");
        return;
      }
      throw error;
    }

    const summary: ChangeSummary = { created: [], edited: [], skipped: [] };
    await assert.rejects(
      ensureDirectory(root, "linked/new-folder", async () => true, summary),
      /symlink outside the project root/,
    );
  });

  it("asks separately before every missing directory and file creation", async () => {
    const root = await createRoot();
    const operations: string[] = [];
    const summary: ChangeSummary = { created: [], edited: [], skipped: [] };
    const confirm = async (operation: string, path: string) => {
      operations.push(`${operation}:${path}`);
      return true;
    };

    assert.equal(await ensureDirectory(root, "one/two", confirm, summary), true);
    await writeConfirmedFile(root, "one/two/file.txt", "hello", confirm, summary);
    assert.deepEqual(operations.map((operation) => operation.split(":")[0]), [
      "create directory",
      "create directory",
      "create file",
    ]);
    assert.equal(await readFile(join(root, "one", "two", "file.txt"), "utf8"), "hello");
  });

  it("does not create a declined directory or file", async () => {
    const root = await createRoot();
    const summary: ChangeSummary = { created: [], edited: [], skipped: [] };
    assert.equal(await ensureDirectory(root, "rejected", async () => false, summary), false);
    await assert.rejects(stat(join(root, "rejected")), { code: "ENOENT" });
    assert.equal(summary.skipped.length, 1);
  });

  it("asks before editing existing content and preserves it when declined", async () => {
    const root = await createRoot();
    const summary: ChangeSummary = { created: [], edited: [], skipped: [] };
    await writeConfirmedFile(root, "existing.txt", "original", async () => true, summary);
    await writeConfirmedFile(root, "existing.txt", "updated", async () => false, summary);
    assert.equal(await readFile(join(root, "existing.txt"), "utf8"), "original");
    assert.ok(summary.skipped.includes("edit file existing.txt"));
  });
});
