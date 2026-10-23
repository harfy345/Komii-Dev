import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "templates", "komii-dev");
const destination = resolve(root, "dist", "templates", "komii-dev");
const adapterSource = resolve(root, "templates", "adapters");
const adapterDestination = resolve(root, "dist", "templates", "adapters");

await mkdir(dirname(destination), { recursive: true });
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
await cp(adapterSource, adapterDestination, { recursive: true });
