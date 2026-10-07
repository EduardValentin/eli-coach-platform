import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SERVER_DIRECTORY = "build/server";
const REQUIRED_SERVER_OUTPUTS = ["index.js", "pdf-pages-worker.js"];

const STATIC_IMPORT =
  /^(?:import|export)\b[^'"\n]*?\bfrom\s*['"]([^'"\n]+)['"]/gm;
const SIDE_EFFECT_IMPORT = /^import\s*['"]([^'"\n]+)['"]/gm;
const DYNAMIC_IMPORT = /\bimport\(\s*['"]([^'"\s]+)['"]\s*\)/g;

export function bareImportsOf(source) {
  const specifiers = new Set();

  for (const pattern of [STATIC_IMPORT, SIDE_EFFECT_IMPORT, DYNAMIC_IMPORT]) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      const isBare = !specifier.startsWith(".") && !specifier.startsWith("/");

      if (isBare && !specifier.startsWith("node:")) {
        specifiers.add(specifier);
      }
    }
  }

  return [...specifiers].sort();
}

export function unresolvableImports(deployDirectory, specifiers) {
  const probe = `
    const missing = [];
    for (const specifier of ${JSON.stringify(specifiers)}) {
      try { import.meta.resolve(specifier); } catch { missing.push(specifier); }
    }
    process.stdout.write(JSON.stringify(missing));
  `;
  const output = execFileSync(
    process.execPath,
    ["--input-type=module", "--eval", probe],
    { cwd: resolve(deployDirectory, SERVER_DIRECTORY), encoding: "utf8" },
  );

  return JSON.parse(output);
}

function serverModulesOf(serverDirectory) {
  const emitted = readdirSync(serverDirectory, { recursive: true }).filter(
    (path) => path.endsWith(".js"),
  );

  return [...new Set([...REQUIRED_SERVER_OUTPUTS, ...emitted])];
}

function main(deployDirectory) {
  const serverDirectory = resolve(deployDirectory, SERVER_DIRECTORY);
  const bundles = serverModulesOf(serverDirectory).map((path) =>
    readFileSync(resolve(serverDirectory, path), "utf8"),
  );
  const missing = unresolvableImports(
    deployDirectory,
    bareImportsOf(bundles.join("\n")),
  );

  if (missing.length > 0) {
    console.error(
      `The server bundle imports packages the deploy layout cannot resolve; declare them as dependencies of the app:\n  ${missing.join("\n  ")}`,
    );
    process.exit(1);
  }

  console.log(
    "Every bare import of the server bundle, the PDF pages worker and their chunks resolves from the deploy layout.",
  );
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main(process.argv[2] ?? ".");
}
