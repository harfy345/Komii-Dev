import { createInterface } from "node:readline/promises";
import type { ConfirmOperation, Operation } from "./filesystem-safety.js";

export function createConfirmer(): ConfirmOperation {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return async (operation, path) => {
      console.error(`Confirmation required; not performing ${operation}: ${path}`);
      return false;
    };
  }

  let terminal: ReturnType<typeof createInterface> | undefined;
  const confirm = async (operation: Operation, path: string): Promise<boolean> => {
    terminal ??= createInterface({ input: process.stdin, output: process.stdout });
    const answer = await terminal.question(`Allow ${operation} "${path}"? [y/N] `);
    return answer.trim().toLowerCase() === "y";
  };
  process.once("beforeExit", () => terminal?.close());
  return confirm;
}
