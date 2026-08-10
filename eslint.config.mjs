import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

// `infrastructure` has no single barrel by design: it mixes browser and server
// concerns, and a subpath export map (e.g. `@eli-coach-platform/infrastructure/pwa`)
// is what keeps server-only code out of browser bundles. Every other workspace
// package is still required to expose one public entry point.
const workspacePackageDeepImportPattern =
  "^@eli-coach-platform\\/(?!ui\\/styles\\.css$|infrastructure\\/)[^/]+\\/.+";
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
      "ImportExpression[source.value=/^@eli-coach-platform\\/(?!ui\\/styles\\.css$|infrastructure\\/)[^/]+\\/.+/]",
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
// feature's `data/`, `api/`, or `email/` — server-only code that has no
// `.server`-suffix guarantee once a file is registered as a route (routes.ts
// strips the suffix from anything the client route manifest must resolve;
// see the waitlist route). This is the backstop that keeps that server code
// out of the browser bundle regardless of file naming.
const FEATURE_UI_SERVER_IMPORT_MESSAGE =
  "features/*/ui/** must not import features/*/{data,api,email}/** — keep server-only code out of the browser bundle.";
const featureUiServerImportRestriction = {
  group: [
    "~/features/*/data/**",
    "~/features/*/api/**",
    "~/features/*/email/**",
  ],
  message: FEATURE_UI_SERVER_IMPORT_MESSAGE,
};
const featureUiServerImportSyntaxRestriction = {
  message: FEATURE_UI_SERVER_IMPORT_MESSAGE,
  selector:
    "ImportExpression[source.value=/^~\\/features\\/[^/]+\\/(data|api|email)\\/.+/]",
};

// R5 — `~/server/container.server` is the composition root: importing it
// constructs the Postgres pool, the filesystem asset store and the email
// provider. Only the request-handling layer may reach it — a feature's
// `api/`, the app's own `server/api/`, the `.server` half of a route module
// under `ui/` or `surfaces/`, plus `root.tsx` and tests. Relative escapes are
// already closed off: R1 bans `../../` inside the app, and a single `../`
// from inside `features/` never climbs higher than `features/` itself, so
// `~/server/container.server` is the only spelling that reaches it.
//
// The granularity is honest about its mechanism. `no-restricted-imports`
// matches import paths, not file roles, so this fences the *folders* that
// hold route modules rather than route modules individually: a non-route file
// sitting in `features/*/api/` can still import the container. What it does
// buy is the distinction this PR makes real — `catalog-page.server.ts` may
// import the container, and the `catalog-page.tsx` beside it, which React
// Router ships to the browser, may not.
const CONTAINER_IMPORT_MESSAGE =
  "~/server/container.server is importable only from features/*/api/**, server/api/**, a *.server.ts under features/*/ui/** or surfaces/**, root.tsx, and tests.";
const containerImportRestriction = {
  group: ["~/server/container.server"],
  message: CONTAINER_IMPORT_MESSAGE,
};
const containerImportSyntaxRestriction = {
  message: CONTAINER_IMPORT_MESSAGE,
  selector: "ImportExpression[source.value='~/server/container.server']",
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
    // R3 + R5 (non-ui, non-schema files): this feature must not reach into
    // another feature's internals. `ui/**` and `data/schema.server.ts` are
    // handled by the two more specific groups below, which also fold in R6
    // and the foreign-key carve-out respectively. R5 lets `api/**` — the
    // folder that holds this feature's route modules — reach the container.
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
      ],
      syntaxRestrictions: [
        ...workspaceImportSyntaxRestrictions,
        ...platformAppImportSyntaxRestrictions,
        crossFeatureImportSyntaxRestriction,
      ],
    }),
    // R6 + R3 + R5: this feature's ui/** must not import this (or any)
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
      ],
      syntaxRestrictions: [
        ...workspaceImportSyntaxRestrictions,
        ...platformAppImportSyntaxRestrictions,
        featureUiServerImportSyntaxRestriction,
        crossFeatureImportSyntaxRestriction,
      ],
    }),
    // R3 + foreign-key carve-out: only data/schema.server.ts may import
    // another feature's data/schema.server.ts, to declare a foreign key. It
    // is not on R5's allowlist, so it carries the container restriction.
    ...createContainerFencedConfigs({
      files: [`${featureRoot}/data/schema.server.ts`],
      patterns: [
        ...workspaceImportRestrictionPatterns,
        ...platformAppImportRestrictionPatterns,
        dataSchemaCrossFeatureImportRestriction,
      ],
      syntaxRestrictions: [
        ...workspaceImportSyntaxRestrictions,
        ...platformAppImportSyntaxRestrictions,
        dataSchemaCrossFeatureImportSyntaxRestriction,
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
const BOUNDARY_FENCED_FEATURES = ["store", "waitlist"];

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
  // R1 + R5 across the app. A fenced feature's own files are re-covered by
  // the per-feature blocks below, which restate R5 alongside R3/R6, so the
  // allowlist here names only the arms that live outside a feature.
  ...createContainerFencedConfigs({
    containerAllowedFiles: [
      "apps/platform/src/server/api/**/*.{ts,tsx}",
      "apps/platform/src/surfaces/**/*.server.ts",
      "apps/platform/src/root.tsx",
      "apps/platform/src/**/*.test.{ts,tsx}",
    ],
    files: ["apps/platform/src/**/*.{ts,tsx}"],
    patterns: [
      ...workspaceImportRestrictionPatterns,
      ...platformAppImportRestrictionPatterns,
    ],
    syntaxRestrictions: [
      ...workspaceImportSyntaxRestrictions,
      ...platformAppImportSyntaxRestrictions,
    ],
  }),
  ...BOUNDARY_FENCED_FEATURES.flatMap(createFeatureBoundaryConfigs),
];
