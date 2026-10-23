# Architecture

The CLI is a small Node.js TypeScript application with three command modules:

- `init` operates in the current directory, loads packaged Markdown templates, and installs every supported agent instruction file without attempting to identify the user's editor, agent, model, language, or project structure.
- `update` adds missing starter files, refreshes unchanged CLI-managed templates using an internal hash manifest, and updates only marked Komii Dev instruction-reference blocks. User-edited templates and unrelated instruction text are preserved.
- `doctor` diagnoses expected knowledge files and configured instruction references.

Shared filesystem safety utilities validate project-relative paths. `init` and `update` display a read-only preview and require one approval for the entire command before creating directories or writing files. The CLI refuses writes without an interactive terminal. Templates are copied into the build output and shipped with the npm package. No LLM or provider API is used.

## Boundaries and limitations

The CLI never analyzes source code or calls a model. The coding agent selected by the user initializes project knowledge. Existing knowledge files are user-owned and never overwritten by `init` or `update`.
