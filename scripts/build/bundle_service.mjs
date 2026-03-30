import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [entryPoint, outputFile] = process.argv.slice(2);

if (!entryPoint || !outputFile) {
  console.error("Usage: node scripts/build/bundle_service.mjs <entry-point> <output-file>");
  process.exit(1);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..", "..");

await build({
  absWorkingDir: projectRoot,
  bundle: true,
  entryPoints: [entryPoint],
  external: ["node:*"],
  format: "cjs",
  outfile: outputFile,
  platform: "node",
  sourcemap: false,
  target: "node22",
});
