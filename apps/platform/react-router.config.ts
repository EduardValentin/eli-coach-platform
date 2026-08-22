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
  appDirectory: "src",
  // The portal authorization middleware needs React Router 7's middleware API,
  // which stays behind this flag until v8.
  future: { v8_middleware: true },
  basename,
  buildDirectory: "build",
  prerender: ["/", "/blog", "/store/download", "/privacy", "/terms"],
  ssr: true,
} satisfies Config;
