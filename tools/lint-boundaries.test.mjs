import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

const FEATURES_DIRECTORY = "apps/platform/src/features";

// Every scenario lints source over `--stdin-filename`. The path names a
// *region* the boundary rules must cover, not a file that must exist: eslint
// resolves configuration from the filename without reading it, so a probe
// survives the moves this restructure keeps making, and a rule bound to one
// exact path (the foreign-key carve-out) becomes testable at all.
//
// Nothing here passes `--no-ignore`, and that is the point. A fixture file
// linted with `--no-ignore` proves a rule is *configured*; it cannot notice
// that the region stopped being linted. Re-adding a broad ignore such as
// `**/public/**` — the regression `eslint.config.mjs` memorialises — would
// silently unfence real store UI while leaving such a fixture green. Run
// without the flag, an ignored region reports `File ignored …` instead of the
// rule, and `lintSourceAs` turns that into a named failure.
const APP_ALIAS_PROBE_PATH =
  "apps/platform/src/routes/marketing/layout/layout.tsx";
const STORE_NON_UI_PROBE_PATH =
  "apps/platform/src/features/store/api/catalog-controller.server.ts";
const STORE_UI_PROBE_PATH =
  "apps/platform/src/features/store/ui/public/store-catalog-page.tsx";
const STORE_DATA_SCHEMA_PROBE_PATH =
  "apps/platform/src/features/store/data/schema.server.ts";
// The `.server.ts` half of the route module probed above. Naming the pair
// after one another is the point of R5: same folder, same base name, opposite
// answers, because only one of the two is shipped to the browser.
const STORE_UI_LOADER_PROBE_PATH =
  "apps/platform/src/features/store/ui/public/store-catalog-page.server.ts";
const STORE_UI_TEST_PROBE_PATH =
  "apps/platform/src/features/store/ui/public/store-catalog-page.test.tsx";
const APP_SERVER_API_PROBE_PATH = "apps/platform/src/server/api/readyz.ts";
const APP_ROOT_PROBE_PATH = "apps/platform/src/root.tsx";
const SURFACE_LOADER_PROBE_PATH =
  "apps/platform/src/surfaces/public-site/pages/store-catalog-page.server.ts";

const CONTAINER_MODULE = "~/server/container.server";

const IGNORED_FILE_WARNING = "File ignored because of a matching ignore pattern";
const CROSS_FEATURE_FRAGMENT =
  "must not import another feature's internals";
const UI_SERVER_IMPORT_FRAGMENT =
  "features/*/ui/** must not import features/*/{data,api,email}/**";
const FOREIGN_KEY_CARVE_OUT_FRAGMENT =
  "and <feature>/data/schema.server (for foreign keys) are public across features";
const CONTAINER_IMPORT_FRAGMENT =
  "~/server/container.server is importable only from";

// `--silent` keeps pnpm's own notices (an unsupported-engine warning, an
// update notice) off the child's stdout. Without it they land ahead of the
// JSON and every scenario fails with an opaque SyntaxError that names neither
// eslint nor the boundaries it is checking.
function lintSourceAs(source, filePath) {
  const args = [
    "--silent",
    "exec",
    "eslint",
    "--format",
    "json",
    "--stdin",
    "--stdin-filename",
    filePath,
  ];
  let stdout;
  let stderr = "";

  try {
    stdout = execFileSync("pnpm", args, {
      encoding: "utf8",
      input: source,
      stdio: "pipe",
    });
  } catch (error) {
    stdout = error.stdout;
    stderr = error.stderr ?? "";
  }

  if (!stdout) {
    throw new Error(`eslint produced no stdout to parse. stderr:\n${stderr}`);
  }

  const messages = JSON.parse(stdout).flatMap((result) => result.messages);

  if (messages.some((message) => message.message.includes(IGNORED_FILE_WARNING))) {
    throw new Error(
      `eslint is ignoring ${filePath}, so no boundary rule can apply to it. ` +
        "An ignore pattern grew to cover a linted region.",
    );
  }

  return messages;
}

function restrictedImports(messages) {
  return messages
    .filter((message) => message.ruleId === "no-restricted-imports")
    .map((message) => message.message);
}

function importing(specifier) {
  return `import { probeValue } from "${specifier}";\n\nexport const probe = probeValue;\n`;
}

describe("app-local import boundary", () => {
  it("reports a deep relative import inside the app source tree", () => {
    // arrange
    const source = importing("../../probe-target");

    // act
    const messages = lintSourceAs(source, APP_ALIAS_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining("Use the app root alias"),
    );
  });
});

describe("feature boundary coverage", () => {
  const featureNames = readdirSync(FEATURES_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  it.each(featureNames)(
    "fences %s against another feature's internals",
    (featureName) => {
      // arrange
      const source = importing("~/features/__none__/data/x");

      // act
      const messages = lintSourceAs(
        source,
        `${FEATURES_DIRECTORY}/${featureName}/__probe__.ts`,
      );

      // assert
      expect(restrictedImports(messages)).toContainEqual(
        expect.stringContaining(
          `features/${featureName}/** ${CROSS_FEATURE_FRAGMENT}`,
        ),
      );
    },
  );
});

describe("store feature boundary", () => {
  it("reports a non-ui store file importing another feature's internals", () => {
    // arrange
    const source = importing("~/features/waitlist/data/repository.server");

    // act
    const messages = lintSourceAs(source, STORE_NON_UI_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining(`features/store/** ${CROSS_FEATURE_FRAGMENT}`),
    );
  });

  it("reports a store ui file importing the store's own data layer", () => {
    // arrange
    const source = importing("~/features/store/data/catalog-repository.server");

    // act
    const messages = lintSourceAs(source, STORE_UI_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining(UI_SERVER_IMPORT_FRAGMENT),
    );
  });

  // The R6 message above is shared by every feature, so on its own it would
  // still pass if the store's own trio disappeared and a generic
  // `features/*/ui/**` block replaced it. This pins the store-named rule to
  // the same ui path.
  it("reports a store ui file importing another feature's internals", () => {
    // arrange
    const source = importing("~/features/waitlist/data/repository.server");

    // act
    const messages = lintSourceAs(source, STORE_UI_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining(`features/store/** ${CROSS_FEATURE_FRAGMENT}`),
    );
  });

  it("allows the store schema to import another feature's data/schema.server for a foreign key", () => {
    // arrange
    const source = importing("~/features/waitlist/data/schema.server");

    // act
    const messages = lintSourceAs(source, STORE_DATA_SCHEMA_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toEqual([]);
  });

  it("reports the store schema importing anything else of another feature's", () => {
    // arrange
    const source = importing("~/features/waitlist/data/repository.server");

    // act
    const messages = lintSourceAs(source, STORE_DATA_SCHEMA_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining(FOREIGN_KEY_CARVE_OUT_FRAGMENT),
    );
  });
});

// R5. Both directions are asserted, and every arm of the allowlist has a
// scenario, because a rule that permits too much is as broken as one that
// fires too often — and unlike R3/R6, most of R5's arms have no file
// exercising them today, so nothing but these scenarios would notice the
// allowlist widening.
describe("platform container boundary", () => {
  it("reports a store ui route module importing the platform container", () => {
    // arrange
    const source = importing(CONTAINER_MODULE);

    // act
    const messages = lintSourceAs(source, STORE_UI_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining(CONTAINER_IMPORT_FRAGMENT),
    );
  });

  it("allows the sibling .server.ts loader under store ui to import the platform container", () => {
    // arrange
    const source = importing(CONTAINER_MODULE);

    // act
    const messages = lintSourceAs(source, STORE_UI_LOADER_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toEqual([]);
  });

  // The `.server` suffix is not the licence on its own — the file also has to
  // sit under `ui/**` or `surfaces/**`. Without this, widening that arm to a
  // bare `**/*.server.ts` would leave every other scenario here green while
  // handing the container to the whole data layer.
  it("reports a .server.ts outside ui/ importing the platform container", () => {
    // arrange
    const source = importing(CONTAINER_MODULE);

    // act
    const messages = lintSourceAs(source, STORE_DATA_SCHEMA_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining(CONTAINER_IMPORT_FRAGMENT),
    );
  });

  it("allows a feature's api/** to import the platform container", () => {
    // arrange
    const source = importing(CONTAINER_MODULE);

    // act
    const messages = lintSourceAs(source, STORE_NON_UI_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toEqual([]);
  });

  it("allows the app's own server/api/** to import the platform container", () => {
    // arrange
    const source = importing(CONTAINER_MODULE);

    // act
    const messages = lintSourceAs(source, APP_SERVER_API_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toEqual([]);
  });

  it("allows root.tsx to import the platform container", () => {
    // arrange
    const source = importing(CONTAINER_MODULE);

    // act
    const messages = lintSourceAs(source, APP_ROOT_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toEqual([]);
  });

  // `surfaces/` holds nothing but its README until PR 6, so no file exercises
  // this arm. Probing the path is what keeps it from being discovered wrong
  // on the day the shell and pages land there.
  it("allows a .server.ts under surfaces/ to import the platform container", () => {
    // arrange
    const source = importing(CONTAINER_MODULE);

    // act
    const messages = lintSourceAs(source, SURFACE_LOADER_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toEqual([]);
  });

  it("allows a test beside a ui route module to import the platform container", () => {
    // arrange
    const source = importing(CONTAINER_MODULE);

    // act
    const messages = lintSourceAs(source, STORE_UI_TEST_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toEqual([]);
  });
});
