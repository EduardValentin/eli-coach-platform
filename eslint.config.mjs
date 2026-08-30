import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

// `infrastructure` has no single barrel by design: it mixes browser and server
// concerns, and a subpath export map (e.g. `@eli-coach-platform/infrastructure/pwa`)
// is what keeps server-only code out of browser bundles. Every other workspace
// package is still required to expose one public entry point.
//
// `config/test-support` is the third exemption, and it is a boundary rather
// than a hole. ARCHITECTURE.md rules that a barrel carries intentional public
// contracts and never helpers made public for test convenience, so shared test
// fixtures — the Clerk credential triple several suites each need to load a
// runtime environment — cannot live on `config`'s barrel. Giving them a
// declared subpath of their own says out loud which imports are test-only, and
// keeps them out of every production import path.
const workspacePackageDeepImportPattern =
  "^@eli-coach-platform\\/(?!ui\\/styles\\.css$|infrastructure\\/|config\\/test-support$)[^/]+\\/.+";
const workspaceRelativeImportPatterns = [
  "../**/packages/*",
  "../**/packages/**",
  "../*/src/**",
  "../../*/src/**",
  "../../../*/src/**",
  "../../../../*/src/**",
  "../../../../../*/src/**",
];
const workspaceImportRestrictionPatterns = [
  {
    message: "Import workspace packages through their public package barrel.",
    regex: workspacePackageDeepImportPattern,
  },
  {
    group: workspaceRelativeImportPatterns,
    message: "Import workspace packages through their package name.",
  },
];
const workspaceImportSyntaxRestrictions = [
  {
    message: "Import workspace packages through their public package barrel.",
    selector:
      "ImportExpression[source.value=/^@eli-coach-platform\\/(?!ui\\/styles\\.css$|infrastructure\\/|config\\/test-support$)[^/]+\\/.+/]",
  },
  {
    message: "Import workspace packages through their package name.",
    selector: "ImportExpression[source.value=/^\\.\\.\\/.*\\/packages\\//]",
  },
  {
    message: "Import workspace packages through their package name.",
    selector: "ImportExpression[source.value=/^\\.\\.\\/(?:\\.\\.\\/)*[^/]+\\/src\\//]",
  },
];
const platformAppImportRestrictionPatterns = [
  {
    message: "Use the app root alias for app-local imports that cross multiple directories.",
    regex: "^\\.\\.\\/\\.\\.\\/(?!.*\\/packages\\/).+",
  },
];
const platformAppImportSyntaxRestrictions = [
  {
    message: "Use the app root alias for app-local imports that cross multiple directories.",
    selector: "ImportExpression[source.value=/^\\.\\.\\/\\.\\.\\/(?!.*\\/packages\\/).+/]",
  },
];

// R6 — a feature's `ui/**` is browser-bundled, so it must never import that
// feature's `data/`, `api/`, `email/`, or `server/` — server-only code that
// has no `.server`-suffix guarantee once a file is registered as a route
// (routes.ts strips the suffix from anything the client route manifest must
// resolve; see the waitlist route). This is the backstop that keeps that
// server code out of the browser bundle regardless of file naming.
//
// `server/` joined the fenced group for the same reason as the other three:
// it holds guards and middleware factories meant to be called from outside
// the feature — a surface's `.server.ts` loader, under R2's carve-out — not
// from the feature's own browser-bound `ui/**`. R2 widens what a *surface's*
// server half may reach; it says nothing about a feature reaching its own
// `server/**` from `ui/**`, and nothing today does. Keeping this arm of R6 in
// sync with that folder is what makes ARCHITECTURE.md's "keep a feature's
// browser half out of its server half" bullet mechanically true rather than
// merely true by convention.
const FEATURE_UI_SERVER_IMPORT_MESSAGE =
  "features/*/ui/** must not import features/*/{data,api,email,server}/** — keep server-only code out of the browser bundle.";
const featureUiServerImportRestriction = {
  group: [
    "~/features/*/data/**",
    "~/features/*/api/**",
    "~/features/*/email/**",
    "~/features/*/server/**",
  ],
  message: FEATURE_UI_SERVER_IMPORT_MESSAGE,
};
const featureUiServerImportSyntaxRestriction = {
  message: FEATURE_UI_SERVER_IMPORT_MESSAGE,
  selector:
    "ImportExpression[source.value=/^~\\/features\\/[^/]+\\/(data|api|email|server)\\/.+/]",
};

// R5 — `~/server/container.server` is the composition root: importing it
// constructs the Postgres pool, the filesystem asset store and the email
// provider. Only the request-handling layer may reach it — a feature's
// `api/`, the app's own `server/api/`, the `.server` half of a route module
// under `ui/` or `surfaces/`, plus `root.server.ts` and tests.
// Relative escapes are already closed off: R1 bans `../../` inside the app,
// and a single `../` from inside `features/` never climbs higher than
// `features/` itself, so `~/server/container.server` is the only spelling
// that reaches it.
//
// `root.server.ts` is on the allowlist so the root's middleware array can be
// composed on the server side of the root's own split. Root middleware needs
// the container — the account-resolution middleware is built from it. Before
// that split, the array had to be assembled in `root.tsx`, the module React
// Router ships to the browser, with nothing but export-stripping and
// dead-code elimination keeping the composition root out of the client
// bundle, so `root.tsx` carried a matching carve-out. Composing it in
// `root.server.ts` means the client half never names the container at all,
// so `root.tsx` no longer needs — or gets — the allowance; it is fenced like
// any other file the request-handling layer does not own.
//
// The granularity is honest about its mechanism. `no-restricted-imports`
// matches import paths, not file roles, so this fences the *folders* that
// hold route modules rather than route modules individually: a non-route file
// sitting in `features/*/api/` can still import the container. What it does
// buy is the distinction this PR makes real — `catalog-page.server.ts` may
// import the container, and the `catalog-page.tsx` beside it, which React
// Router ships to the browser, may not.
const CONTAINER_IMPORT_MESSAGE =
  "~/server/container.server is importable only from features/*/api/**, server/api/**, a *.server.ts under features/*/ui/** or surfaces/**, root.server.ts, and tests.";
const containerImportRestriction = {
  group: ["~/server/container.server"],
  message: CONTAINER_IMPORT_MESSAGE,
};
const containerImportSyntaxRestriction = {
  message: CONTAINER_IMPORT_MESSAGE,
  selector: "ImportExpression[source.value='~/server/container.server']",
};

// R7 — nothing outside `surfaces/` may import a surface. R2 and R4 below fence
// the two directions a surface can go wrong; this is the third edge, and the
// one the restructure already acted on by hand when it promoted the motion
// module into `packages/ui` rather than let a feature reach for the public
// site's copy. A surface assembles features into a product: the moment a
// feature — or the app's own `server/` — reaches back for `~/surfaces/**`,
// that feature stops being portable between surfaces and the assembly
// direction is lost.
//
// Two regions carry it, and only two, because a later block replaces a rule's
// options outright rather than merging them: the app-wide region — which
// covers `server/**`, `root.tsx`, `routes.ts` and everything else app-local
// that no other region re-covers — and each fenced feature's three regions.
// The surface regions deliberately do not carry it: a surface importing its
// own surface is exactly what R4 permits, and R7 cannot tell the two apart
// because `no-restricted-imports` matches specifiers, not the file's own
// location. That is the same limit that makes R2, R3 and R4 per-region.
//
// Two consequences follow from where it is written. An *unfenced* feature
// directory still lands on the app-wide region, so R7 has a floor that a
// missing `BOUNDARY_FENCED_FEATURES` entry cannot lower — unlike R3. An
// unfenced *surface* directory lands there too, where R7 would wrongly reject
// its own self-imports; that is a false positive confined to a state
// `tools/lint-boundaries.test.mjs` already fails on loudly, naming the real
// problem (the surface is unfenced), so it is recorded rather than patched.
const SURFACE_IMPORT_MESSAGE =
  "Only a surface may import ~/surfaces/** — features/** and server/** are what a surface composes, not the other way round; share through features/*/ui/** or @eli-coach-platform/ui instead.";
const surfaceImportRestriction = {
  message: SURFACE_IMPORT_MESSAGE,
  regex: "^~\\/surfaces(?:\\/|$)",
};
const surfaceImportSyntaxRestriction = {
  message: SURFACE_IMPORT_MESSAGE,
  selector: "ImportExpression[source.value=/^~\\/surfaces(?:\\/|$)/]",
};

// Every rule's options are set by a whole config block, and a later block
// replaces them outright rather than merging, so R5's allowlist cannot be a
// single extra block layered on top — that block would also wipe R1/R3/R6 off
// the files it covers. A region that allows the container import has to be
// the same block written twice: once over the denied paths carrying the
// restriction, once over the allowed paths without it. This returns that
// pair (or the single block, when nothing in the region is allowed), so each
// caller still describes its file set once.
//
// `containerAllowedFiles` must be a subset of `files`: the allowed block
// below is `{ files: containerAllowedFiles, ... }` with no check against the
// region's own `files`, so an allowlist entry outside the region would hand
// that region's entire rule set — not just the container allowance — to
// files the region never covered.
function createContainerFencedConfigs({
  containerAllowedFiles = [],
  files,
  ignores = [],
  patterns,
  syntaxRestrictions,
}) {
  const rulesAllowingContainer = {
    "no-restricted-imports": ["error", { patterns }],
    "no-restricted-syntax": ["error", ...syntaxRestrictions],
  };
  const rulesDenyingContainer = {
    "no-restricted-imports": [
      "error",
      { patterns: [...patterns, containerImportRestriction] },
    ],
    "no-restricted-syntax": [
      "error",
      ...syntaxRestrictions,
      containerImportSyntaxRestriction,
    ],
  };
  const denied = {
    files,
    ignores: [...ignores, ...containerAllowedFiles],
    rules: rulesDenyingContainer,
  };

  if (containerAllowedFiles.length === 0) {
    return [denied];
  }

  return [
    denied,
    { files: containerAllowedFiles, ignores, rules: rulesAllowingContainer },
  ];
}

// R3 — a feature may not reach into another feature's internals. Only
// `<feature>/contracts/**` (wire schemas) and `<feature>/ui/shared/**`
// (shared components) are public across features, plus a narrow carve-out:
// `<feature>/data/schema.server.ts` may import another feature's
// `data/schema.server.ts` to declare a foreign key.
//
// `no-restricted-imports` has no way to compare "the feature this file
// lives in" against "the feature this file imports" in one generic pattern,
// so each feature needs its own trio of blocks, self-excluded by name.
// `createFeatureBoundaryConfigs` below generates that trio from a feature
// name and `BOUNDARY_FENCED_FEATURES` maps it over every fenced feature, so
// fencing the next feature is adding one string to that list — not copying
// three blocks.
function createFeatureCrossImportRestriction(featureName, options) {
  const exemptSubpaths = options?.exemptSubpaths ?? [];
  const exemptAlternation = ["contracts\\/", "ui\\/shared\\/", ...exemptSubpaths]
    .join("|");

  return {
    message: `features/${featureName}/** must not import another feature's internals — only <feature>/contracts/**, <feature>/ui/shared/**${
      exemptSubpaths.length > 0 ? ", and <feature>/data/schema.server (for foreign keys)" : ""
    } are public across features.`,
    regex: `^~\\/features\\/(?!${featureName}\\/)[^/]+\\/(?!${exemptAlternation}).+`,
  };
}
function createFeatureCrossImportSyntaxRestriction(featureName, options) {
  const restriction = createFeatureCrossImportRestriction(featureName, options);

  return {
    message: restriction.message,
    selector: `ImportExpression[source.value=/${restriction.regex}/]`,
  };
}
const FOREIGN_KEY_SCHEMA_EXEMPTION = {
  exemptSubpaths: ["data\\/schema\\.server$"],
};

// Returns the flat-config blocks that fence one feature. They cover disjoint
// file sets — `ui/**`, `data/schema.server.ts`, and everything else — so each
// of a feature's files lands in exactly one of them and picks up exactly one
// variant of R3. Each region is then split again by R5's allowlist, because a
// block owns a rule's options outright; see `createContainerFencedConfigs`.
function createFeatureBoundaryConfigs(featureName) {
  const featureRoot = `apps/platform/src/features/${featureName}`;
  const crossFeatureImportRestriction =
    createFeatureCrossImportRestriction(featureName);
  const crossFeatureImportSyntaxRestriction =
    createFeatureCrossImportSyntaxRestriction(featureName);
  const dataSchemaCrossFeatureImportRestriction =
    createFeatureCrossImportRestriction(
      featureName,
      FOREIGN_KEY_SCHEMA_EXEMPTION,
    );
  const dataSchemaCrossFeatureImportSyntaxRestriction =
    createFeatureCrossImportSyntaxRestriction(
      featureName,
      FOREIGN_KEY_SCHEMA_EXEMPTION,
    );

  return [
    // R3 + R5 + R7 (non-ui, non-schema files): this feature must not reach into
    // another feature's internals. `ui/**` and `data/schema.server.ts` are
    // handled by the two more specific groups below, which also fold in R6
    // and the foreign-key carve-out respectively. R5 lets `api/**` — the
    // folder that holds this feature's route modules — reach the container.
    //
    // `server/**` is not on that allowlist, and that omission is a ruling, not
    // an oversight: `api/` is the feature's delivery layer, and it alone is
    // where a request-handling module gets to resolve its own dependencies
    // from the composition root. `server/**` holds the feature's guards,
    // middleware factories and request-context definitions — code meant to be
    // called from other layers, including a surface's `.server.ts` loader
    // under R2's carve-out — and it takes its dependencies injected instead.
    // `createAccountResolutionMiddleware(getContainer, getEnvironment)` in
    // `features/accounts/server/account-resolution-middleware.server.ts` is
    // the pattern: the factory accepts getters for the container and the
    // environment rather than importing `~/server/container.server` itself,
    // so the middleware stays testable with a stub and stays honest about the
    // one dependency it actually needs. A `server/**` module that reached for
    // the container directly would blur that line and make the feature's
    // guards untestable without the whole composition root.
    ...createContainerFencedConfigs({
      containerAllowedFiles: [
        `${featureRoot}/api/**/*.{ts,tsx}`,
        `${featureRoot}/**/*.test.{ts,tsx}`,
      ],
      files: [`${featureRoot}/**/*.{ts,tsx}`],
      ignores: [
        `${featureRoot}/ui/**`,
        `${featureRoot}/data/schema.server.ts`,
      ],
      patterns: [
        ...workspaceImportRestrictionPatterns,
        ...platformAppImportRestrictionPatterns,
        crossFeatureImportRestriction,
        surfaceImportRestriction,
      ],
      syntaxRestrictions: [
        ...workspaceImportSyntaxRestrictions,
        ...platformAppImportSyntaxRestrictions,
        crossFeatureImportSyntaxRestriction,
        surfaceImportSyntaxRestriction,
      ],
    }),
    // R6 + R3 + R5 + R7: this feature's ui/** must not import this (or any)
    // feature's data/api/email, and must not reach into another feature's
    // internals either. R5 splits `ui/**` where it matters most — a route
    // module's `.server.ts` loader may build the container, the `.tsx` route
    // module beside it, which React Router ships to the browser, may not.
    ...createContainerFencedConfigs({
      containerAllowedFiles: [
        `${featureRoot}/ui/**/*.server.ts`,
        `${featureRoot}/ui/**/*.test.{ts,tsx}`,
      ],
      files: [`${featureRoot}/ui/**/*.{ts,tsx}`],
      patterns: [
        ...workspaceImportRestrictionPatterns,
        ...platformAppImportRestrictionPatterns,
        featureUiServerImportRestriction,
        crossFeatureImportRestriction,
        surfaceImportRestriction,
      ],
      syntaxRestrictions: [
        ...workspaceImportSyntaxRestrictions,
        ...platformAppImportSyntaxRestrictions,
        featureUiServerImportSyntaxRestriction,
        crossFeatureImportSyntaxRestriction,
        surfaceImportSyntaxRestriction,
      ],
    }),
    // R3 + foreign-key carve-out + R7: only data/schema.server.ts may import
    // another feature's data/schema.server.ts, to declare a foreign key. It
    // is not on R5's allowlist, so it carries the container restriction.
    ...createContainerFencedConfigs({
      files: [`${featureRoot}/data/schema.server.ts`],
      patterns: [
        ...workspaceImportRestrictionPatterns,
        ...platformAppImportRestrictionPatterns,
        dataSchemaCrossFeatureImportRestriction,
        surfaceImportRestriction,
      ],
      syntaxRestrictions: [
        ...workspaceImportSyntaxRestrictions,
        ...platformAppImportSyntaxRestrictions,
        dataSchemaCrossFeatureImportSyntaxRestriction,
        surfaceImportSyntaxRestriction,
      ],
    }),
  ];
}

// Every feature under `apps/platform/src/features/`. Scaffolding a feature
// means adding its name here — the trio is generated. Forgetting is the
// failure mode that matters, because an unfenced feature lints green, so
// `tools/lint-boundaries.test.mjs` derives its own feature list from the
// directories and fails when a directory here is missing from this list,
// proving the generated rules actually fire. It does not catch the opposite
// drift — a stale entry with no matching directory — but that direction is
// harmless: nothing lints against a feature that doesn't exist.
const BOUNDARY_FENCED_FEATURES = ["accounts", "coaching-bundles", "store", "waitlist"];

// R2 — a surface reaches a feature only through the UI slice built for it,
// that feature's surface-agnostic `ui/shared/**`, its `server/**`, or its
// `contracts/**`. Everything else the feature owns is private to it: `data/`,
// `api/` and `email/` are the feature's own persistence and route-delivery
// layers, and another slice under `ui/` is another surface's screens.
//
// `server/**` is the feature's server code that is neither of those: guards,
// request-context definitions, middleware factories. A surface's own
// `.server.ts` half has to be able to call a feature's guard directly — a
// portal layout's access-guard middleware is exactly where authorization is
// decided — and before
// `server/**` was public that forced server-only auth code to sit under
// `ui/shared/**` pretending to be a shared component. Nothing under
// `server/**` is browser-bound, so the arm widens what a surface's server half
// may call without widening what it may render.
//
// This is a permission, not only a ban. A page behind several features is
// meant to sit on the surface and compose each feature's `ui/` — which is
// what `/pricing` does today, importing `coaching-bundles/ui/public/` and
// `waitlist/ui/public/` side by side. The rule has to keep letting that
// through while still rejecting the slice next door.
//
// `no-restricted-imports` matches specifiers, not file roles, so it cannot
// compare "the surface this file lives in" against "the slice this file
// imports" in one generic pattern — the same limit that makes R3 per-feature
// makes R2 per-surface. `createSurfaceBoundaryConfigs` generates a surface's
// blocks from its name and slice, and `BOUNDARY_FENCED_SURFACES` maps it over
// all three.
function createSurfaceFeatureImportRestriction(surfaceName, uiSlice) {
  // Both spellings of a feature path are covered: the bare feature root
  // (`~/features/store`, which no feature exposes and none should — there is
  // no feature-root barrel, precisely so one cannot re-export every surface's
  // UI together) and any deeper path under it.
  const publicSubpathAlternation = [
    "contracts(?:\\/|$)",
    "server(?:\\/|$)",
    `ui\\/(?:${uiSlice}|shared)(?:\\/|$)`,
  ].join("|");

  return {
    message: `surfaces/${surfaceName}/** may import only features/*/ui/${uiSlice}/**, features/*/ui/shared/**, features/*/server/**, and features/*/contracts/** — never another surface's slice, and never data/, api/, or email/.`,
    regex: `^~\\/features\\/[^/]+(?:$|\\/(?!${publicSubpathAlternation}).+)`,
  };
}
function createSurfaceFeatureImportSyntaxRestriction(surfaceName, uiSlice) {
  const restriction = createSurfaceFeatureImportRestriction(surfaceName, uiSlice);

  return {
    message: restriction.message,
    selector: `ImportExpression[source.value=/${restriction.regex}/]`,
  };
}

// R4 — the three surfaces must not import each other. They are three products
// sharing one deployable: a portal reaching into the public site's shell, or
// into the other portal's, would make one surface's navigation change break
// another's. What they legitimately share goes through `features/*/ui/shared/**`
// or `@eli-coach-platform/ui` instead.
//
// One relative escape stays open, and R3 has the same shape. R1 bans `../../`
// inside the app, so from any file nested at least one level under a surface
// (`pages/`, `shell/`, `sections/…`) a single `../` cannot climb out of the
// surface and `~/surfaces/…` is the only spelling that reaches a sibling. A
// file sitting *directly* at a surface root is the exception: for it one `../`
// already lands in `surfaces/`, so `../coach-portal/shell/layout` is
// unreported. No such file exists — every surface file is under `pages/`,
// `shell/`, `sections/` or `api/` — and closing it means teaching R1 about
// depth, so it is recorded rather than patched.
function createCrossSurfaceImportRestriction(surfaceName) {
  return {
    message: `surfaces/${surfaceName}/** must not import another surface — the surfaces share code through features/*/ui/shared/** and @eli-coach-platform/ui, not through each other.`,
    regex: `^~\\/surfaces\\/(?!${surfaceName}(?:\\/|$)).+`,
  };
}
function createCrossSurfaceImportSyntaxRestriction(surfaceName) {
  const restriction = createCrossSurfaceImportRestriction(surfaceName);

  return {
    message: restriction.message,
    selector: `ImportExpression[source.value=/${restriction.regex}/]`,
  };
}

// Returns the flat-config blocks that fence one surface. A surface has no
// equivalent of a feature's `ui/` split — every file under it is browser-bound
// except the `.server.ts` loaders — so one region covers the whole surface,
// split only by R5's allowlist, because a block owns a rule's options
// outright; see `createContainerFencedConfigs`.
//
// Restating R1 here is not redundant. The app-wide block above already covers
// these files, but a later block *replaces* a rule's options rather than
// merging them, so the moment this block sets `no-restricted-imports` it owns
// every pattern that applies to the surface.
function createSurfaceBoundaryConfigs({ surfaceName, uiSlice }) {
  const surfaceRoot = `apps/platform/src/surfaces/${surfaceName}`;

  return createContainerFencedConfigs({
    // A subset of `files` below, as `createContainerFencedConfigs` requires.
    // These mirror the two surface arms of the app-wide R5 allowlist: a
    // `.server.ts` loader, and a test.
    containerAllowedFiles: [
      `${surfaceRoot}/**/*.server.ts`,
      `${surfaceRoot}/**/*.test.{ts,tsx}`,
    ],
    files: [`${surfaceRoot}/**/*.{ts,tsx}`],
    patterns: [
      ...workspaceImportRestrictionPatterns,
      ...platformAppImportRestrictionPatterns,
      createSurfaceFeatureImportRestriction(surfaceName, uiSlice),
      createCrossSurfaceImportRestriction(surfaceName),
    ],
    syntaxRestrictions: [
      ...workspaceImportSyntaxRestrictions,
      ...platformAppImportSyntaxRestrictions,
      createSurfaceFeatureImportSyntaxRestriction(surfaceName, uiSlice),
      createCrossSurfaceImportSyntaxRestriction(surfaceName),
    ],
  });
}

// Every surface under `apps/platform/src/surfaces/`, with the `ui/` slice each
// one owns. The short forms are ARCHITECTURE.md's convention: `public-site`
// → `ui/public/`, `client-portal` → `ui/client/`, `coach-portal` → `ui/coach/`.
// As with the feature list, an unfenced surface lints green, so
// `tools/lint-boundaries.test.mjs` derives its own surface list from the
// directories and fails when one is missing here.
const BOUNDARY_FENCED_SURFACES = [
  { surfaceName: "client-portal", uiSlice: "client" },
  { surfaceName: "coach-portal", uiSlice: "coach" },
  { surfaceName: "public-site", uiSlice: "public" },
];

export default [
  {
    ignores: [
      "**/build/**",
      "**/coverage/**",
      "**/.react-router/**",
      "**/.turbo/**",
      // Anchored to the app root's static-asset directory (icons, service
      // workers, media). A bare "**/public/**" also matched
      // `features/*/ui/public/**` — a feature's public-surface *source*
      // folder, not a static-asset directory — and silently excluded it
      // from every lint rule, including the R6/R3 boundary rules below.
      "apps/*/public/**",
      "designs/**",
    ],
  },
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: "module",
      },
    },
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      // TypeScript owns symbol resolution; these core JS rules report false positives on TS syntax.
      "no-undef": "off",
      "no-unused-vars": "off",
      ...jsxA11y.flatConfigs.strict.rules,
      "no-restricted-imports": [
        "error",
        {
          patterns: workspaceImportRestrictionPatterns,
        },
      ],
      "no-restricted-syntax": ["error", ...workspaceImportSyntaxRestrictions],
    },
  },
  // R1 + R5 + R7 across the app. Files inside a fenced feature or a fenced
  // surface are re-covered by the blocks below, which restate R5 alongside
  // R3/R6/R7 or R2/R4 — and because a later block replaces a rule's options
  // outright, it is *their* allowlist, not this one, that decides the answer
  // for those files. R7 is the one rule the surface blocks drop rather than
  // restate, for the reason recorded at its definition.
  //
  // So `apps/platform/src/surfaces/**/*.server.ts` below is currently dead:
  // every surface is in `BOUNDARY_FENCED_SURFACES`, and deleting the arm
  // changes no file's resolved config. It is kept deliberately, as the
  // fallback for a surface directory that exists but has no entry in that
  // list. In that state the surface is unfenced — which
  // `tools/lint-boundaries.test.mjs` fails on loudly, naming the real problem
  // — and this arm keeps R5 from failing its loaders for an unrelated reason
  // on the way there. The `server/api/**`, `root.server.ts` and test arms are
  // shadowed by nothing and carry the rule outright. `root.tsx` is
  // deliberately absent: it no longer imports the container now that
  // `root.server.ts` composes root middleware, so the carve-out would be a
  // standing hazard rather than a needed allowance — any future container
  // import from `root.tsx` should fail the same way it would from any other
  // client-shipped route module.
  ...createContainerFencedConfigs({
    containerAllowedFiles: [
      "apps/platform/src/server/api/**/*.{ts,tsx}",
      "apps/platform/src/surfaces/**/*.server.ts",
      "apps/platform/src/root.server.ts",
      "apps/platform/src/**/*.test.{ts,tsx}",
    ],
    files: ["apps/platform/src/**/*.{ts,tsx}"],
    patterns: [
      ...workspaceImportRestrictionPatterns,
      ...platformAppImportRestrictionPatterns,
      surfaceImportRestriction,
    ],
    syntaxRestrictions: [
      ...workspaceImportSyntaxRestrictions,
      ...platformAppImportSyntaxRestrictions,
      surfaceImportSyntaxRestriction,
    ],
  }),
  ...BOUNDARY_FENCED_FEATURES.flatMap(createFeatureBoundaryConfigs),
  ...BOUNDARY_FENCED_SURFACES.flatMap(createSurfaceBoundaryConfigs),
];
