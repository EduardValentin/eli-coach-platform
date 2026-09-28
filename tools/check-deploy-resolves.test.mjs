import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  bareImportsOf,
  unresolvableImports,
} from "./check-deploy-resolves.mjs";

function deployLayoutWith(packages) {
  const root = mkdtempSync(join(tmpdir(), "deploy-resolves-"));
  mkdirSync(join(root, "build", "server"), { recursive: true });
  writeFileSync(join(root, "build", "server", "index.js"), "");

  for (const name of packages) {
    const directory = join(root, "node_modules", name);
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({ name, main: "index.js" }),
    );
    writeFileSync(join(directory, "index.js"), "module.exports = {};");
  }

  return root;
}

describe("bareImportsOf", () => {
  it("lists every package the bundle imports, skipping relative and node built-ins", () => {
    // arrange
    const bundle = [
      'import { a } from "react-router";',
      'import "stripe/side-effect";',
      'const lazy = () => import("@clerk/backend");',
      'import { b } from "./local.js";',
      'import { c } from "node:crypto";',
      'import { d } from "react-router";',
    ].join("\n");

    // act
    const imports = bareImportsOf(bundle);

    // assert
    expect(imports).toEqual([
      "@clerk/backend",
      "react-router",
      "stripe/side-effect",
    ]);
  });
});

describe("unresolvableImports", () => {
  it("names the packages the deploy layout cannot resolve from the server bundle", () => {
    // arrange
    const deployDirectory = deployLayoutWith(["react-router"]);

    // act
    const missing = unresolvableImports(deployDirectory, [
      "@clerk/backend",
      "react-router",
      "stripe",
    ]);

    // assert
    expect(missing).toEqual(["@clerk/backend", "stripe"]);
  });
});
