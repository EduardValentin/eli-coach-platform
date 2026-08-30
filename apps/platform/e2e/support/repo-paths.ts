import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const supportDirectory = fileURLToPath(new URL(".", import.meta.url));

// This file's own directory is the one fixed point every other path in the
// suite hangs off — config, global-setup, global-teardown, and the runtime
// registry all used to recompute their own relative depth to the e2e
// directory and the repo root, which drifted whenever a file moved. Derive
// both here once instead.
// apps/platform/e2e/support -> apps/platform/e2e
export const e2eDirectory = resolve(supportDirectory, "..");
// apps/platform/e2e/support -> apps/platform/e2e -> apps/platform -> apps -> repo root
export const repoRootDirectory = resolve(supportDirectory, "../../../..");
export const repoRootEnvPath = resolve(repoRootDirectory, ".env");
