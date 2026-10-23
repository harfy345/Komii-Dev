import { createInterface } from "node:readline/promises";
import type { ConfirmOperation } from "./filesystem-safety.js";

export function createConfirmer(): ConfirmOperation {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return async () => {
      console.error("Confirmation required; not performing planned filesystem changes.");
      return false;
    };
  }

  let terminal: ReturnType<typeof createInterface> | undefined;
  const confirm: ConfirmOperation = async () => {
    terminal ??= createInterface({ input: process.stdin, output: process.stdout });
    const answer = await terminal.question(`Proceed with all planned changes? [y/N] `);
    return answer.trim().toLowerCase() === "y";
  };
  process.once("beforeExit", () => terminal?.close());
  return confirm;
}
