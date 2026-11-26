import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);

const PDF_PAGES_WORKER_OUTPUT = "pdf-pages-worker.js";

function emitPdfPagesWorker(): Plugin {
  const workerSource = fileURLToPath(
    new URL(
      "./src/shared/documents/pdf-pages-worker.server.ts",
      import.meta.url,
    ),
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

/**
 * The build is served under a prefix chosen at container start, so a chunk or
 * stylesheet must find its neighbours relative to itself. Other assets a module
 * imports keep their `/`-based URL, which the app prefixes when it renders them.
 */
function resolveBuiltUrlAgainstItsImporter(
  fileName: string,
  { hostType }: { hostType: "js" | "css" | "html" },
) {
  if (hostType === "css" || /\.(js|css)$/.test(fileName)) {
    return { relative: true };
  }

  return undefined;
}

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), emitPdfPagesWorker()],
  optimizeDeps: { exclude: ["@napi-rs/canvas", "pdfjs-dist"] },
  resolve: {
    alias: {
      "~": resolve(currentDirectory, "src"),
    },
  },
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          input: resolve(
            currentDirectory,
            "src/composition-root/server-build.server.ts",
          ),
        },
      },
    },
  },
  experimental: {
    renderBuiltUrl: resolveBuiltUrlAgainstItsImporter,
  },
});
