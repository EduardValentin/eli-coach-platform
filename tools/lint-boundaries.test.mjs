import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

const FEATURES_DIRECTORY = "apps/platform/src/features";
const SURFACES_DIRECTORY = "apps/platform/src/surfaces";

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
  "apps/platform/src/surfaces/public-site/pages/home.tsx";
const STORE_NON_UI_PROBE_PATH =
  "apps/platform/src/features/store/api/catalog-controller.server.ts";
const STORE_UI_PROBE_PATH =
  "apps/platform/src/features/store/ui/public/catalog-page.tsx";
const STORE_DATA_SCHEMA_PROBE_PATH =
  "apps/platform/src/features/store/data/schema.server.ts";
// The `.server.ts` half of the route module probed above. Naming the pair
// after one another is the point of R5: same folder, same base name, opposite
// answers, because only one of the two is shipped to the browser.
const STORE_UI_LOADER_PROBE_PATH =
  "apps/platform/src/features/store/ui/public/catalog-page.server.ts";
const STORE_UI_TEST_PROBE_PATH =
  "apps/platform/src/features/store/ui/public/catalog-page.test.tsx";
const APP_SERVER_API_PROBE_PATH = "apps/platform/src/server/api/readyz.ts";
const APP_SERVER_API_META_PROBE_PATH = "apps/platform/src/server/api/meta.ts";
// The app's server layer outside `server/api/**`, so the half of the app-wide
// region that R5 denies rather than allows.
const APP_SERVER_CONTAINER_PROBE_PATH =
  "apps/platform/src/server/container.server.ts";
// The module React Router ships to the browser. It no longer composes the
// root middleware array itself — `root.server.ts` does — so it carries no
// container allowance; R5 denies it exactly like any other client-shipped
// route module.
const APP_ROOT_PROBE_PATH = "apps/platform/src/root.tsx";
// The server half of the root's own split. It composes the root middleware
// array — which needs the container — so R5 allows it exactly as it allows the
// `.server.ts` half of any other route module.
const APP_ROOT_SERVER_PROBE_PATH = "apps/platform/src/root.server.ts";
const PUBLIC_SITE_SHELL_PROBE_PATH =
  "apps/platform/src/surfaces/public-site/shell/public-footer.tsx";
const SURFACE_LOADER_PROBE_PATH =
  "apps/platform/src/surfaces/public-site/pages/store-catalog-page.server.ts";
const PUBLIC_SITE_PAGE_PROBE_PATH =
  "apps/platform/src/surfaces/public-site/pages/pricing.tsx";
const CLIENT_PORTAL_PAGE_PROBE_PATH =
  "apps/platform/src/surfaces/client-portal/pages/home.tsx";
const COACH_PORTAL_PAGE_PROBE_PATH =
  "apps/platform/src/surfaces/coach-portal/pages/home.tsx";

const CONTAINER_MODULE = "~/server/container.server";
// Specifiers used as positive controls: each is rejected by a boundary rule
// that is *not* the one under test, at every path where it appears.
const APP_ALIAS_CONTROL_MODULE = "../../probe-target";
const SURFACE_FEATURE_CONTROL_MODULE =
  "~/features/store/data/catalog-repository.server";
const SURFACE_MODULE = "~/surfaces/public-site/shell/layout";
const OWN_SURFACE_MODULE = "~/surfaces/public-site/sections/legal/legal-nav";

const IGNORED_FILE_WARNING = "File ignored because of a matching ignore pattern";
const APP_ALIAS_FRAGMENT = "Use the app root alias";
const CROSS_SURFACE_FRAGMENT = "must not import another surface";
const UI_SERVER_IMPORT_FRAGMENT =
  "features/*/ui/** must not import features/*/{data,api,email,server}/**";
const CONTAINER_IMPORT_FRAGMENT =
  "~/server/container.server is importable only from";
const SURFACE_IMPORT_FRAGMENT = "Only a surface may import ~/surfaces/**";

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

// The `no-restricted-syntax` half of every boundary rule. `no-restricted-imports`
// cannot see a dynamic `import(...)`, which is why each rule is written twice.
function restrictedSyntax(messages) {
  return messages
    .filter((message) => message.ruleId === "no-restricted-syntax")
    .map((message) => message.message);
}

// Takes one specifier, or two when a scenario needs a positive control
// alongside the specifier under test.
function importing(...specifiers) {
  const statements = specifiers
    .map((specifier, index) => `import { probe${index} } from "${specifier}";`)
    .join("\n");
  const values = specifiers.map((_, index) => `probe${index}`).join(", ");

  return `${statements}\n\nexport const probe = [${values}];\n`;
}

// The dynamic counterpart of `importing`, variadic for the same reason: an
// allow scenario needs a positive control alongside the specifier under test.
function dynamicallyImporting(...specifiers) {
  const expressions = specifiers
    .map((specifier) => `    import("${specifier}"),`)
    .join("\n");

  return `export async function probe() {\n  return [\n${expressions}\n  ];\n}\n`;
}

describe("app-local import boundary", () => {
  it("reports a deep relative import inside the app source tree", () => {
    // arrange
    const source = importing(APP_ALIAS_CONTROL_MODULE);

    // act
    const messages = lintSourceAs(source, APP_ALIAS_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining(APP_ALIAS_FRAGMENT),
    );
  });
});

describe("feature boundary coverage", () => {
  const featureNames = readdirSync(FEATURES_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  // R3 is gone, so a feature reaching a sibling is no longer the thing that
  // proves it was fenced. R6 is. Its message is not feature-named, unlike R3's,
  // so this asserts the shared fragment — which is still enough, because R6
  // exists only inside `createFeatureBoundaryConfigs`: a feature missing from
  // BOUNDARY_FENCED_FEATURES lints entirely silent rather than differently.
  it.each(featureNames)("fences %s's ui against its server half", (featureName) => {
    // arrange
    const source = importing(`~/features/${featureName}/data/repository.server`);

    // act
    const messages = lintSourceAs(
      source,
      `${FEATURES_DIRECTORY}/${featureName}/ui/public/__probe__.tsx`,
    );

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining(UI_SERVER_IMPORT_FRAGMENT),
    );
  });
});

describe("store feature boundary", () => {
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

  // `server/**` joined R6's fenced group alongside `data/`, `api/` and
  // `email/`: it holds guards and middleware factories meant to be called
  // from outside the feature (a surface's `.server.ts` loader, under R2's
  // carve-out), not from the feature's own browser-bound `ui/**`. The store
  // feature has no `server/` folder today — the probe specifier below names
  // the region a rule must cover, not a file that has to exist, the same way
  // every other probe in this file does.
  it("reports a store ui file importing the store's own server folder", () => {
    // arrange
    const source = importing("~/features/store/server/probe.server");

    // act
    const messages = lintSourceAs(source, STORE_UI_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining(UI_SERVER_IMPORT_FRAGMENT),
    );
  });
});

// Both fragments name the surface, and R2's names its slice too, so a
// scenario cannot be satisfied by a neighbouring surface's rule firing.
function surfaceSliceFragment({ surfaceName, uiSlice }) {
  return `surfaces/${surfaceName}/** may import only features/*/ui/${uiSlice}/**`;
}
function crossSurfaceFragment(surfaceName) {
  return `surfaces/${surfaceName}/** ${CROSS_SURFACE_FRAGMENT}`;
}

// One row per surface. A surface's `ui/` slice is the short form of its
// directory name, which makes the mapping the part most likely to be typed
// wrong, so every row drives both halves of it: the slice this surface owns
// goes through, the slice next door does not.
const SURFACE_SLICE_SCENARIOS = [
  {
    crossSurfaceControlModule: "~/surfaces/coach-portal/shell/layout",
    foreignSliceModule: "~/features/training/ui/client/active-workout-tracker",
    ownSliceModule: "~/features/store/ui/public/cart-drawer",
    path: PUBLIC_SITE_PAGE_PROBE_PATH,
    surfaceName: "public-site",
    uiSlice: "public",
  },
  {
    crossSurfaceControlModule: "~/surfaces/coach-portal/shell/layout",
    foreignSliceModule: "~/features/training/ui/coach/plan-builder",
    ownSliceModule: "~/features/training/ui/client/active-workout-tracker",
    path: CLIENT_PORTAL_PAGE_PROBE_PATH,
    surfaceName: "client-portal",
    uiSlice: "client",
  },
  {
    crossSurfaceControlModule: "~/surfaces/client-portal/shell/layout",
    foreignSliceModule: "~/features/store/ui/public/cart-drawer",
    ownSliceModule: "~/features/training/ui/coach/plan-builder",
    path: COACH_PORTAL_PAGE_PROBE_PATH,
    surfaceName: "coach-portal",
    uiSlice: "coach",
  },
];

// R2 and R4. Both have a permission half that matters as much as the ban:
// composing feature UI is what a surface page is *for*, and the public site
// really does import across its own `sections/`, `shell/` and `pages/`. So
// every allowed scenario carries a control drawn from the *other* rule the
// same config block adds — "R2 silent, R4 loud", and the reverse. A bare "no
// error" would also be produced by a path that matched no `files` pattern and
// was never linted at all, which is how a mutation stripped three rules in
// PR 5 with the suite still green.
describe("surface boundary", () => {
  it.each(SURFACE_SLICE_SCENARIOS)(
    "allows $surfaceName to import a feature's $uiSlice slice, ui/shared and contracts",
    (scenario) => {
      // arrange
      const source = importing(
        scenario.ownSliceModule,
        "~/features/store/ui/shared/product-summary",
        "~/features/store/contracts/store",
        scenario.crossSurfaceControlModule,
      );

      // act
      const reported = restrictedImports(lintSourceAs(source, scenario.path));

      // assert
      expect(reported).not.toContainEqual(
        expect.stringContaining(surfaceSliceFragment(scenario)),
      );
      expect(reported).toContainEqual(
        expect.stringContaining(crossSurfaceFragment(scenario.surfaceName)),
      );
    },
  );

  it.each(SURFACE_SLICE_SCENARIOS)(
    "reports $surfaceName importing another surface's ui slice",
    (scenario) => {
      // arrange
      const source = importing(scenario.foreignSliceModule);

      // act
      const messages = lintSourceAs(source, scenario.path);

      // assert
      expect(restrictedImports(messages)).toContainEqual(
        expect.stringContaining(surfaceSliceFragment(scenario)),
      );
    },
  );

  // The arm that lets a surface's own server half call a feature's guards and
  // read its request contexts, so that server-only auth code no longer has to
  // sit under `ui/shared/**` pretending to be a shared component. `server/**`
  // is the only server-side folder of a feature a surface may reach — the
  // scenario below keeps `data/`, `api/` and `email/` banned — and this one
  // carries the same R4 control as the slice scenarios above, so "R2 silent"
  // cannot be a path that was never linted.
  it.each(SURFACE_SLICE_SCENARIOS)(
    "allows $surfaceName to import a feature's server folder",
    (scenario) => {
      // arrange
      const source = importing(
        "~/features/accounts/server/require-account.server",
        scenario.crossSurfaceControlModule,
      );

      // act
      const reported = restrictedImports(lintSourceAs(source, scenario.path));

      // assert
      expect(reported).not.toContainEqual(
        expect.stringContaining(surfaceSliceFragment(scenario)),
      );
      expect(reported).toContainEqual(
        expect.stringContaining(crossSurfaceFragment(scenario.surfaceName)),
      );
    },
  );

  it.each(["data", "api", "email"])(
    "reports a public-site page importing a feature's %s folder",
    (serverOnlyFolder) => {
      // arrange
      const source = importing(
        `~/features/store/${serverOnlyFolder}/probe.server`,
      );

      // act
      const messages = lintSourceAs(source, PUBLIC_SITE_PAGE_PROBE_PATH);

      // assert
      expect(restrictedImports(messages)).toContainEqual(
        expect.stringContaining(
          surfaceSliceFragment({ surfaceName: "public-site", uiSlice: "public" }),
        ),
      );
    },
  );

  // The case R2 exists to permit, and the one a too-narrow rule breaks first:
  // `/pricing` is behind two features, so the surface holds the page and
  // composes each feature's public UI. These are the imports
  // `surfaces/public-site/pages/pricing.tsx` really makes.
  it("allows a public-site page to compose two features' public UI", () => {
    // arrange
    const source = importing(
      "~/features/coaching-bundles/ui/public/bundle-selector",
      "~/features/waitlist/ui/public/availability-status",
      "~/features/waitlist/ui/public/email-form",
      "~/surfaces/coach-portal/shell/layout",
    );

    // act
    const reported = restrictedImports(
      lintSourceAs(source, PUBLIC_SITE_PAGE_PROBE_PATH),
    );

    // assert
    expect(reported).not.toContainEqual(
      expect.stringContaining(
        surfaceSliceFragment({ surfaceName: "public-site", uiSlice: "public" }),
      ),
    );
    expect(reported).toContainEqual(
      expect.stringContaining(crossSurfaceFragment("public-site")),
    );
  });

  it("reports a client-portal page importing the coach portal", () => {
    // arrange
    const source = importing("~/surfaces/coach-portal/shell/layout");

    // act
    const messages = lintSourceAs(source, CLIENT_PORTAL_PAGE_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining(crossSurfaceFragment("client-portal")),
    );
  });

  it("allows a public-site page to import its own surface", () => {
    // arrange
    const source = importing(
      "~/surfaces/public-site/sections/hero/hero",
      "~/surfaces/public-site/shell/layout",
      SURFACE_FEATURE_CONTROL_MODULE,
    );

    // act
    const reported = restrictedImports(
      lintSourceAs(source, PUBLIC_SITE_PAGE_PROBE_PATH),
    );

    // assert
    expect(reported).not.toContainEqual(
      expect.stringContaining(crossSurfaceFragment("public-site")),
    );
    expect(reported).toContainEqual(
      expect.stringContaining(
        surfaceSliceFragment({ surfaceName: "public-site", uiSlice: "public" }),
      ),
    );
  });
});

// The surface counterpart of `feature boundary coverage` earlier in this file.
// An unfenced surface lints green, so the list of surfaces comes from the
// directories rather than from the config, and adding a fourth surface without
// an entry in `BOUNDARY_FENCED_SURFACES` fails here.
describe("surface boundary coverage", () => {
  const surfaceNames = readdirSync(SURFACES_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  it.each(surfaceNames)(
    "fences %s against a feature's private folders and the other surfaces",
    (surfaceName) => {
      // arrange
      const source = importing(
        "~/features/__none__/data/x",
        "~/surfaces/__none__/x",
      );

      // act
      const reported = restrictedImports(
        lintSourceAs(source, `${SURFACES_DIRECTORY}/${surfaceName}/__probe__.ts`),
      );

      // assert
      expect(reported).toContainEqual(
        expect.stringContaining(
          `surfaces/${surfaceName}/** may import only features/*/ui/`,
        ),
      );
      expect(reported).toContainEqual(
        expect.stringContaining(crossSurfaceFragment(surfaceName)),
      );
    },
  );
});

// R7 — the reverse of R2. R2 and R4 fence what a surface may reach for; this
// is the edge nothing fenced before, so `features/store/ui/public/catalog-page.tsx`
// importing `~/surfaces/public-site/shell/layout` linted clean.
//
// One row per region that owns a copy of the restriction, because a later
// block replaces a rule's options outright: each of a fenced feature's two
// regions, and the app-wide region that covers everything else — probed on
// both sides of its R5 split, since a future change could give the two halves
// separate pattern lists.
const SURFACE_IMPORTER_SCENARIOS = [
  { path: STORE_UI_PROBE_PATH, region: "a feature's ui/**" },
  { path: STORE_NON_UI_PROBE_PATH, region: "a feature's api/**" },
  { path: APP_SERVER_API_META_PROBE_PATH, region: "the app's own server/api/**" },
  {
    path: APP_SERVER_CONTAINER_PROBE_PATH,
    region: "the app's server layer outside server/api/**",
  },
];

describe("surface import boundary", () => {
  it.each(SURFACE_IMPORTER_SCENARIOS)(
    "reports $region importing a surface",
    ({ path }) => {
      // arrange
      const source = importing(SURFACE_MODULE);

      // act
      const messages = lintSourceAs(source, path);

      // assert
      expect(restrictedImports(messages)).toContainEqual(
        expect.stringContaining(SURFACE_IMPORT_FRAGMENT),
      );
    },
  );

  // The permission half. The surface regions drop R7 rather than restate it,
  // so the fenced surfaces are the one place `~/surfaces/**` stays importable
  // — which is what R4 already governs. A bare "R7 reported nothing" cannot
  // tell that apart from a path that matched no `files` pattern and was never
  // linted, so this carries a control from the other rule the same block adds:
  // R7 silent, R2 loud.
  it("allows a surface to import its own surface, with its other fences intact", () => {
    // arrange
    const source = importing(OWN_SURFACE_MODULE, SURFACE_FEATURE_CONTROL_MODULE);

    // act
    const reported = restrictedImports(
      lintSourceAs(source, PUBLIC_SITE_SHELL_PROBE_PATH),
    );

    // assert
    expect(reported).not.toContainEqual(
      expect.stringContaining(SURFACE_IMPORT_FRAGMENT),
    );
    expect(reported).toContainEqual(
      expect.stringContaining(
        surfaceSliceFragment({ surfaceName: "public-site", uiSlice: "public" }),
      ),
    );
  });
});

// Each arm of R5's allowlist, paired with an import the *other* boundary
// rules must still reject at that same path.
//
// A bare "R5 reported nothing" is ambiguous three ways: the arm allows the
// container (what we mean); or the block that allows it dropped R1/R6 on
// the way past, because a flat-config block sets a rule's options outright
// rather than merging them; or the path matches no `files` pattern at all and
// was never linted, which produces zero messages and — unlike an `ignores`
// match — no warning for `lintSourceAs` to catch. The control separates the
// first from the other two: R5 silent, the neighbouring rule loud.
const CONTAINER_ALLOWED_ARMS = [
  {
    arm: "a feature's api/**",
    controlFragment: SURFACE_IMPORT_FRAGMENT,
    controlSpecifier: SURFACE_MODULE,
    path: STORE_NON_UI_PROBE_PATH,
  },
  {
    arm: "the .server.ts loader beside a ui route module",
    controlFragment: SURFACE_IMPORT_FRAGMENT,
    controlSpecifier: SURFACE_MODULE,
    path: STORE_UI_LOADER_PROBE_PATH,
  },
  {
    arm: "a test beside a ui route module",
    controlFragment: SURFACE_IMPORT_FRAGMENT,
    controlSpecifier: SURFACE_MODULE,
    path: STORE_UI_TEST_PROBE_PATH,
  },
  {
    arm: "the app's own server/api/**",
    controlFragment: APP_ALIAS_FRAGMENT,
    controlSpecifier: APP_ALIAS_CONTROL_MODULE,
    path: APP_SERVER_API_PROBE_PATH,
  },
  {
    arm: "root.server.ts",
    controlFragment: APP_ALIAS_FRAGMENT,
    controlSpecifier: APP_ALIAS_CONTROL_MODULE,
    path: APP_ROOT_SERVER_PROBE_PATH,
  },
  {
    arm: "a .server.ts under surfaces/",
    controlFragment: APP_ALIAS_FRAGMENT,
    controlSpecifier: APP_ALIAS_CONTROL_MODULE,
    path: SURFACE_LOADER_PROBE_PATH,
  },
];

// R5. Both directions are asserted for every region that owns a copy of the
// allowlist, and every arm of that allowlist has a scenario, because a rule
// that permits too much is as broken as one that fires too often — and unlike
// R6, most of R5's arms have no file exercising them today, so nothing but
// these scenarios would notice the allowlist widening.
//
// "Every region that owns a copy" is the load-bearing part. R5 is not written
// once: the app-wide block states it, and each fenced feature and fenced
// surface restates it, because a later block replaces a rule's options rather
// than merging them. A region's *own* `containerAllowedFiles` is therefore the
// only thing deciding the answer for its files, and each one needs its own
// deny scenario. The allow direction alone cannot catch a widened copy —
// widening a region's allowlist makes its allow scenario pass harder.
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

  // The deny direction for the surfaces region, whose copy of the allowlist
  // lives in `createSurfaceBoundaryConfigs`. Without this, widening that copy
  // to the whole surface — handing the Postgres pool, the asset store and the
  // email provider to every browser-shipped page — leaves `eslint` at exit 0
  // and the rest of this file green, because `a .server.ts under surfaces/`
  // below pins only the allow direction. A page is the right probe: it is what
  // React Router ships to the browser, and its `.server.ts` sibling is what
  // may build the container instead.
  it("reports a surface page importing the platform container", () => {
    // arrange
    const source = importing(CONTAINER_MODULE);

    // act
    const messages = lintSourceAs(source, PUBLIC_SITE_PAGE_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining(CONTAINER_IMPORT_FRAGMENT),
    );
  });

  // `root.tsx` used to carry this allowance because it assembled the root
  // middleware array itself; `root.server.ts` composes that array now, so
  // `root.tsx` never needs to name the container, and leaving the carve-out
  // in place would be a standing hazard — the client bundle could start
  // pulling in the Postgres pool, the asset store and the email provider
  // without any rule noticing. This is the regression that
  // `apps/platform/src/root.tsx` reappearing in `containerAllowedFiles`
  // would reopen.
  it("reports root.tsx importing the platform container", () => {
    // arrange
    const source = importing(CONTAINER_MODULE);

    // act
    const messages = lintSourceAs(source, APP_ROOT_PROBE_PATH);

    // assert
    expect(restrictedImports(messages)).toContainEqual(
      expect.stringContaining(CONTAINER_IMPORT_FRAGMENT),
    );
  });

  it.each(CONTAINER_ALLOWED_ARMS)(
    "allows $arm to import the platform container, with its other fences intact",
    ({ controlFragment, controlSpecifier, path }) => {
      // arrange
      const source = importing(CONTAINER_MODULE, controlSpecifier);

      // act
      const reported = restrictedImports(lintSourceAs(source, path));

      // assert
      expect(reported).not.toContainEqual(
        expect.stringContaining(CONTAINER_IMPORT_FRAGMENT),
      );
      expect(reported).toContainEqual(
        expect.stringContaining(controlFragment),
      );
    },
  );
});

// Every boundary rule is written twice — a `no-restricted-imports` pattern and
// a `no-restricted-syntax` selector — because the first cannot see a dynamic
// `import(...)`. Only the first half was ever exercised: replacing every
// syntax entry with a bare `["error"]` left the whole suite green, so the
// dynamic half of all four rules was deletable without a failure. One
// scenario per rule closes that.
describe("dynamic import boundaries", () => {
  it("reports a dynamic deep relative import inside the app source tree", () => {
    // arrange
    const source = dynamicallyImporting(APP_ALIAS_CONTROL_MODULE);

    // act
    const messages = lintSourceAs(source, APP_ALIAS_PROBE_PATH);

    // assert
    expect(restrictedSyntax(messages)).toContainEqual(
      expect.stringContaining(APP_ALIAS_FRAGMENT),
    );
  });

  it("reports a store ui file dynamically importing the store's own data layer", () => {
    // arrange
    const source = dynamicallyImporting(
      "~/features/store/data/catalog-repository.server",
    );

    // act
    const messages = lintSourceAs(source, STORE_UI_PROBE_PATH);

    // assert
    expect(restrictedSyntax(messages)).toContainEqual(
      expect.stringContaining(UI_SERVER_IMPORT_FRAGMENT),
    );
  });

  it("reports a store ui file dynamically importing the store's own server folder", () => {
    // arrange
    const source = dynamicallyImporting("~/features/store/server/probe.server");

    // act
    const messages = lintSourceAs(source, STORE_UI_PROBE_PATH);

    // assert
    expect(restrictedSyntax(messages)).toContainEqual(
      expect.stringContaining(UI_SERVER_IMPORT_FRAGMENT),
    );
  });

  it("reports a store ui route module dynamically importing the platform container", () => {
    // arrange
    const source = dynamicallyImporting(CONTAINER_MODULE);

    // act
    const messages = lintSourceAs(source, STORE_UI_PROBE_PATH);

    // assert
    expect(restrictedSyntax(messages)).toContainEqual(
      expect.stringContaining(CONTAINER_IMPORT_FRAGMENT),
    );
  });

  it("reports a surface page dynamically importing a feature's data layer", () => {
    // arrange
    const source = dynamicallyImporting(SURFACE_FEATURE_CONTROL_MODULE);

    // act
    const messages = lintSourceAs(source, PUBLIC_SITE_PAGE_PROBE_PATH);

    // assert
    expect(restrictedSyntax(messages)).toContainEqual(
      expect.stringContaining(
        surfaceSliceFragment({ surfaceName: "public-site", uiSlice: "public" }),
      ),
    );
  });

  it("reports a surface page dynamically importing another surface", () => {
    // arrange
    const source = dynamicallyImporting("~/surfaces/coach-portal/shell/layout");

    // act
    const messages = lintSourceAs(source, CLIENT_PORTAL_PAGE_PROBE_PATH);

    // assert
    expect(restrictedSyntax(messages)).toContainEqual(
      expect.stringContaining(crossSurfaceFragment("client-portal")),
    );
  });

  it("reports a feature dynamically importing a surface", () => {
    // arrange
    const source = dynamicallyImporting(SURFACE_MODULE);

    // act
    const messages = lintSourceAs(source, STORE_UI_PROBE_PATH);

    // assert
    expect(restrictedSyntax(messages)).toContainEqual(
      expect.stringContaining(SURFACE_IMPORT_FRAGMENT),
    );
  });

  it("reports a surface page dynamically importing the platform container", () => {
    // arrange
    const source = dynamicallyImporting(CONTAINER_MODULE);

    // act
    const messages = lintSourceAs(source, PUBLIC_SITE_PAGE_PROBE_PATH);

    // assert
    expect(restrictedSyntax(messages)).toContainEqual(
      expect.stringContaining(CONTAINER_IMPORT_FRAGMENT),
    );
  });

  // The one permission scenario here, because R2's `server/**` arm is the one
  // this file adds: a selector that kept banning `server/**` while the pattern
  // allowed it would leave every deny scenario above green. Carries the R4
  // control for the same reason the static allow scenarios do.
  it("allows a surface page to dynamically import a feature's server folder", () => {
    // arrange
    const source = dynamicallyImporting(
      "~/features/accounts/server/require-account.server",
      "~/surfaces/coach-portal/shell/layout",
    );

    // act
    const reported = restrictedSyntax(
      lintSourceAs(source, PUBLIC_SITE_PAGE_PROBE_PATH),
    );

    // assert
    expect(reported).not.toContainEqual(
      expect.stringContaining(
        surfaceSliceFragment({ surfaceName: "public-site", uiSlice: "public" }),
      ),
    );
    expect(reported).toContainEqual(
      expect.stringContaining(crossSurfaceFragment("public-site")),
    );
  });
});
