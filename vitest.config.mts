import { defaultExclude, defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);

const integrationTestGlobs = [
  "apps/**/*.integration.test.{ts,tsx}",
  "packages/**/*.integration.test.{ts,tsx}",
];
const testGlobs = [
  "apps/**/*.test.{ts,tsx}",
  "packages/**/*.test.{ts,tsx}",
  "tools/**/*.test.mjs",
];

export default defineConfig({
  resolve: {
    alias: {
      "~": resolve(currentDirectory, "apps/platform/src"),
      "~test-support": resolve(currentDirectory, "apps/platform/test-support"),
    },
  },
  test: {
    environment: "node",
    // Split only so the integration suite can carry a timeout the unit suite
    // must not pay for. Both projects inherit everything else from this file.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: testGlobs,
          exclude: [...defaultExclude, ...integrationTestGlobs],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: integrationTestGlobs,
          // Every file here drives a real PostgreSQL container through
          // testcontainers. A body measures sub-second idle but has been seen
          // climbing past 4s under full-suite contention, so vitest's 5s
          // default fails it on load rather than on anything being wrong. The
          // hooks already opt out; this is the same opt-out for the bodies,
          // set once so a new integration file inherits it.
          testTimeout: 120_000,
        },
      },
    ],
  },
});
