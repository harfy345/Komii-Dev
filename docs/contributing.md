# Contributing

Contributions should keep the CLI small, cross-platform, and conservative with user files.

1. Install dependencies with `npm install`.
2. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
3. Add focused tests for filesystem safety, adapter behavior, or command output.
4. Keep the CLI model-agnostic: install files, update managed instructions, and check the installation. Do not identify the user's editor, agent, model, or project structure.
5. Never make a filesystem change without a separate confirmation for each directory creation, file creation, or file edit.
6. Keep templates concise and distinguish verified behavior from future plans.
