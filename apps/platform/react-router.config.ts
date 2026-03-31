import type { Config } from "@react-router/dev/config";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const rootDirectory = resolve(currentDirectory, "../..");
const localEnvFile = resolve(rootDirectory, ".env");

if (existsSync(localEnvFile)) {
  process.loadEnvFile(localEnvFile);
}

const basename = process.env.APP_BASE_PATH ?? "/";

export default {
  basename,
  buildDirectory: "build",
  prerender: ["/", "/blog", "/store"],
  ssr: true,
} satisfies Config;
