import { mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, it } from "node:test";
import { adapters } from "../src/adapters/registry.js";
import { runDoctor } from "../src/commands/doctor.js";
import { runInit } from "../src/commands/init.js";
import { runUpdate } from "../src/commands/update.js";

const temporaryDirectories: string[] = [];

async function createRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "komii-dev-command-"));
  temporaryDirectories.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const acceptAll = async () => true;

describe("CLI commands", () => {
  for (const [language, manifest] of [
    ["JavaScript/TypeScript", "package.json"],
    ["Python", "pyproject.toml"],
    ["Java", "pom.xml"],
  ] as const) {
    it(`initializes a representative ${language} project`, async () => {
      const root = await createRoot();
      await writeFile(join(root, manifest), "");
      await runInit(root, acceptAll);
      const contextInstructions = await readFile(join(root, "komii-dev", "AGENT.md"), "utf8");
      assert.match(contextInstructions, /Komii Dev project context/);
      assert.match(contextInstructions, /At the end of every request that changes the project/);
      assert.match(contextInstructions, /Update only the affected knowledge files/);
      assert.match(await readFile(join(root, "AGENTS.md"), "utf8"), /komii-dev\/AGENT\.md/);
    });
  }

  it("operates only in the current directory without searching for a project root", async () => {
    const root = await createRoot();
    await writeFile(join(root, "package.json"), "{}");
    const nested = join(root, "src", "nested");
    await mkdir(nested, { recursive: true });
    const summary = await runInit(nested, acceptAll);
    assert.ok(summary.created.some((entry) => entry.replaceAll("\\", "/").includes("komii-dev/AGENT.md")));
    assert.match(await readFile(join(nested, "AGENTS.md"), "utf8"), /komii-dev\/AGENT\.md/);
    await assert.rejects(readFile(join(root, "komii-dev", "AGENT.md"), "utf8"), { code: "ENOENT" });
  });

  it("preserves existing knowledge and is idempotent", async () => {
    const root = await createRoot();
    await mkdir(join(root, "komii-dev"), { recursive: true });
    await writeFile(join(root, "komii-dev", "AGENT.md"), "user-owned context\n");
    const first = await runInit(root, acceptAll);
    const second = await runInit(root, acceptAll);
    assert.equal(await readFile(join(root, "komii-dev", "AGENT.md"), "utf8"), "user-owned context\n");
    for (const adapter of adapters) {
      assert.match(await readFile(join(root, adapter.instructionPath), "utf8"), /komii-dev\/AGENT\.md/);
    }
    assert.ok(first.created.length > 0);
    assert.deepEqual(second.created, []);
    assert.deepEqual(second.edited, []);
  });

  it("renders all supported adapter locations and avoids duplicate references", async () => {
    const root = await createRoot();
    await runInit(root, acceptAll);
    for (const adapter of adapters) {
      const output = await readFile(join(root, adapter.instructionPath), "utf8");
      assert.match(output, /komii-dev\/AGENT\.md/);
      assert.match(adapter.render(), /komii-dev\/AGENT\.md/);
    }
    const second = await runInit(root, acceptAll);
    assert.deepEqual(second.edited, []);
  });

  it("installs a selectable VS Code agent that follows the chosen model", () => {
    const adapter = adapters.find(({ id }) => id === "vscode-komii-agent");
    assert.ok(adapter);
    assert.equal(adapter.instructionPath, ".github/agents/komii-dev.agent.md");
    const instructions = adapter.render();
    assert.match(instructions, /name: Komii Dev/);
    assert.match(instructions, /user-invocable: true/);
    assert.match(instructions, /Before doing any work on every request, read `komii-dev\/AGENT\.md` first/);
    assert.doesNotMatch(instructions, /^model:/m);
  });

  it("asks before modifying existing agent instructions and preserves declined edits", async () => {
    const root = await createRoot();
    const instructions = join(root, "AGENTS.md");
    await writeFile(instructions, "Existing project guidance.\n");
    const rejectedEdit = await runInit(
      root,
      async (operation, path) => operation !== "edit file" || !path.endsWith("AGENTS.md"),
    );
    assert.equal(await readFile(instructions, "utf8"), "Existing project guidance.\n");
    assert.ok(rejectedEdit.skipped.includes("edit file AGENTS.md"));

    const acceptedEdit = await runInit(root, acceptAll);
    assert.match(await readFile(instructions, "utf8"), /Existing project guidance\./);
    assert.match(await readFile(instructions, "utf8"), /komii-dev\/AGENT\.md/);
    assert.ok(acceptedEdit.edited.includes("file AGENTS.md"));
  });

  it("updates missing files without replacing user-edited content", async () => {
    const root = await createRoot();
    await mkdir(join(root, "komii-dev"), { recursive: true });
    await writeFile(join(root, "komii-dev", "AGENT.md"), "customized\n");
    await writeFile(join(root, "AGENTS.md"), [
      "<!-- komii-dev:instructions:start -->",
      "obsolete managed instructions",
      "<!-- komii-dev:instructions:end -->",
    ].join("\n"));
    const summary = await runUpdate(root, acceptAll);
    assert.equal(await readFile(join(root, "komii-dev", "AGENT.md"), "utf8"), "customized\n");
    assert.ok(summary.created.some((entry) => entry.includes("project-map.md")));
    assert.match(await readFile(join(root, "AGENTS.md"), "utf8"), /selective context-loading guidance/);
    assert.ok(summary.edited.includes("file AGENTS.md"));
  });

  it("refreshes an unchanged managed template after an update is approved", async () => {
    const root = await createRoot();
    await runInit(root, acceptAll);
    const filePath = "komii-dev/project-map.md";
    const oldContent = "old managed template\n";
    await writeFile(join(root, filePath), oldContent);
    const manifestPath = join(root, "komii-dev", ".komii-dev-manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      files: Record<string, string>;
    };
    manifest.files[filePath] = createHash("sha256").update(oldContent).digest("hex");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const summary = await runUpdate(root, acceptAll);
    assert.match(await readFile(join(root, filePath), "utf8"), /Project map/);
    assert.ok(summary.edited.some((entry) => entry.replaceAll("\\", "/") === `file ${filePath}`));
  });

  it("preserves managed templates changed by the user", async () => {
    const root = await createRoot();
    await runInit(root, acceptAll);
    const filePath = join(root, "komii-dev", "architecture.md");
    await writeFile(filePath, "user-maintained architecture\n");

    const summary = await runUpdate(root, acceptAll);
    assert.equal(await readFile(filePath, "utf8"), "user-maintained architecture\n");
    assert.ok(summary.skipped.some((entry) => entry.replaceAll("\\", "/").includes("komii-dev/architecture.md")));
  });

  it("updates the managed VS Code agent instructions without replacing its frontmatter", async () => {
    const root = await createRoot();
    await runInit(root, acceptAll);
    const agentPath = join(root, ".github", "agents", "komii-dev.agent.md");
    const original = await readFile(agentPath, "utf8");
    await writeFile(
      agentPath,
      original.replace("Before doing any work on every request", "OUTDATED INSTRUCTION"),
    );

    const summary = await runUpdate(root, acceptAll);
    const updated = await readFile(agentPath, "utf8");
    assert.match(updated, /name: Komii Dev/);
    assert.match(updated, /Before doing any work on every request/);
    assert.doesNotMatch(updated, /OUTDATED INSTRUCTION/);
    assert.ok(summary.edited.some((entry) => entry.replaceAll("\\", "/").endsWith(".github/agents/komii-dev.agent.md")));
  });

  it("reports incomplete installations through doctor", async () => {
    const root = await createRoot();
    const originalLog = console.log;
    console.log = () => {};
    try {
      assert.equal(await runDoctor(root), false);
    } finally {
      console.log = originalLog;
    }
  });

  it("recognizes a complete installation through doctor", async () => {
    const root = await createRoot();
    await runInit(root, acceptAll);
    const originalLog = console.log;
    console.log = () => {};
    try {
      assert.equal(await runDoctor(root), true);
    } finally {
      console.log = originalLog;
    }
  });
});

it("can decline every operation without mutating the project", async () => {
  const root = await createRoot();
  const attempted: string[] = [];
  const rejecting = async (_operation: string, _path: string) => {
    attempted.push(`${_operation}:${_path}`);
    return false;
  };
  const summary = await runInit(root, rejecting);
  assert.ok(attempted.length > 0);
  assert.ok(summary.skipped.length > 0);
  await assert.rejects(readFile(join(root, "komii-dev", "AGENT.md"), "utf8"), { code: "ENOENT" });
});

it("does not write files from a noninteractive CLI invocation", async () => {
  const root = await createRoot();
  const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
  const tsxLoader = fileURLToPath(new URL("../node_modules/tsx/dist/loader.mjs", import.meta.url));
  const result = spawnSync(
    process.execPath,
    ["--import", pathToFileURL(tsxLoader).href, cliPath, "init"],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Confirmation required; not performing create directory/);
  await assert.rejects(readFile(join(root, "komii-dev", "AGENT.md"), "utf8"), { code: "ENOENT" });
});
