import { defaultExclude, defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);

const integrationTestGlobs = [
  "apps/**/*.integration.test.{ts,tsx}",
  "packages/**/*.integration.test.{ts,tsx}",
];
const toolsTestGlobs = ["tools/**/*.test.mjs"];
const testGlobs = ["apps/**/*.test.{ts,tsx}", "packages/**/*.test.{ts,tsx}"];

export default defineConfig({
  resolve: {
    alias: {
      "~": resolve(currentDirectory, "apps/platform/src"),
      "~integration-test-config": resolve(
        currentDirectory,
        "apps/platform/integration-test-config",
      ),
    },
  },
  test: {
    environment: "node",
    // A memory router builds every action request against http://localhost,
    // while MSW resolves a relative handler path against the DOM location.
    // The page origin has to be the same one, or a fetcher submission
    // forwarded from a memory-router action never meets its handler.
    environmentOptions: {
      happyDOM: { url: "http://localhost" },
      jsdom: { url: "http://localhost" },
    },
    globalSetup: ["./vitest.global-setup.mts"],
    // Split only so the slow suites can carry timeouts the unit suite must not
    // pay for. Every project inherits everything else from this file.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: testGlobs,
          exclude: [
            ...defaultExclude,
            ...integrationTestGlobs,
            ...toolsTestGlobs,
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "tools",
          include: toolsTestGlobs,
          testTimeout: 60_000,
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: integrationTestGlobs,
          // Every file here drives a real PostgreSQL container through
          // testcontainers. Hooks pull and start that container; bodies measure
          // sub-second idle but have been seen climbing past 4s under
          // full-suite contention, so vitest's 5s default fails them on load
          // rather than on anything being wrong. Both opt out here, once, so a
          // new integration file inherits it instead of redeclaring it.
          hookTimeout: 120_000,
          testTimeout: 120_000,
        },
      },
    ],
  },
});
