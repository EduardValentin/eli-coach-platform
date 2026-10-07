import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const rootDirectory = resolve(currentDirectory, "../..");

const PDF_PAGES_WORKER_OUTPUT = "pdf-pages-worker.js";

function emitPdfPagesWorker(): Plugin {
  const workerSource = fileURLToPath(
    import.meta
      .resolve("@eli-coach-platform/infrastructure/documents/pdf-pages-worker"),
  );

  return {
    name: "emit-pdf-pages-worker",
    apply: "build",
    applyToEnvironment: (environment) =>
      environment.config.consumer === "server",
    buildStart() {
      this.emitFile({
        type: "chunk",
        id: workerSource,
        fileName: PDF_PAGES_WORKER_OUTPUT,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDirectory, "");
  const base = env.APP_BASE_PATH ?? "/";

  return {
    base,
    plugins: [tailwindcss(), reactRouter(), emitPdfPagesWorker()],
    optimizeDeps: { exclude: ["@napi-rs/canvas", "pdfjs-dist"] },
    resolve: {
      alias: {
        "~": resolve(currentDirectory, "src"),
      },
    },
  };
});
