#!/usr/bin/env node
import { runDoctor } from "./commands/doctor.js";
import { runInit } from "./commands/init.js";
import { runUpdate } from "./commands/update.js";
import { createConfirmer } from "./core/interaction.js";

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const cwd = process.cwd();
  switch (command) {
    case "init":
      if (args.length > 0) throw new Error("init does not accept options; it installs all supported adapters.");
      await runInit(cwd, createConfirmer());
      break;
    case "update":
      if (args.length > 0) throw new Error("update does not accept options.");
      await runUpdate(cwd, createConfirmer());
      break;
    case "doctor":
      if (args.length > 0) throw new Error("doctor does not accept options.");
      if (!await runDoctor(cwd)) process.exitCode = 1;
      break;
    case "--help":
    case "-h":
    case undefined:
      console.log([
        "Komii Dev — reusable project context for AI coding agents",
        "",
        "Usage:",
        "  komii-dev init",
        "  komii-dev update",
        "  komii-dev doctor",
        "",
        "Commands operate in the current directory. Init installs all supported adapters.",
        "Init and update preview all changes and ask once before writing any files.",
      ].join("\n"));
      break;
    default:
      throw new Error(`Unknown command "${command}". Run "komii-dev --help" for usage.`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
