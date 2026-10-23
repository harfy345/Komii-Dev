import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { adapters } from "../adapters/registry.js";

const knowledgeFiles = [
  "AGENT.md",
  "project-map.md",
  "architecture.md",
  "conventions.md",
  "state.md",
  "decisions.md",
  "skills/explore-project/SKILL.md",
  "skills/implement-feature/SKILL.md",
  "skills/debug/SKILL.md",
];

export async function runDoctor(cwd: string): Promise<boolean> {
  const root = cwd;
  let healthy = true;
  console.log(`Checking Komii Dev installation in ${root}`);
  for (const file of knowledgeFiles) {
    try {
      await access(resolve(root, "komii-dev", file));
      console.log(`  OK  komii-dev/${file}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      healthy = false;
      console.log(`  MISSING  komii-dev/${file}`);
    }
  }

  let references = 0;
  for (const adapter of adapters) {
    try {
      const content = await readFile(resolve(root, adapter.instructionPath), "utf8");
      if (content.includes("komii-dev/AGENT.md")) {
        references++;
        console.log(`  OK  ${adapter.instructionPath} references komii-dev/AGENT.md`);
      } else {
        healthy = false;
        console.log(`  MISSING  Komii Dev reference in ${adapter.instructionPath}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      healthy = false;
      console.log(`  MISSING  ${adapter.instructionPath}`);
    }
  }
  if (references === 0) {
    healthy = false;
    console.log("  MISSING  No supported instruction file references Komii Dev.");
  }
  console.log(healthy
    ? "\nInstallation files look complete. This check cannot verify how an external agent applies instructions."
    : "\nInstallation appears incomplete. Run `komii-dev init` to add missing files.");
  return healthy;
}
