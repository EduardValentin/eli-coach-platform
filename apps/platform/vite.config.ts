import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const rootDirectory = resolve(currentDirectory, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDirectory, "");
  const base = env.APP_BASE_PATH ?? "/";

  return {
    base,
    plugins: [reactRouter()],
  };
});
