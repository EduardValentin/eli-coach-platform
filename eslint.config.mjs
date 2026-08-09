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

// Returns the three flat-config blocks that fence one feature. They cover
// disjoint file sets — `ui/**`, `data/schema.server.ts`, and everything else
// — so each of a feature's files lands in exactly one of them and picks up
// exactly one variant of R3.
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
    // R3 (non-ui, non-schema files): this feature must not reach into
    // another feature's internals. `ui/**` and `data/schema.server.ts` are
    // handled by the two more specific blocks below, which also fold in R6
    // and the foreign-key carve-out respectively.
    {
      files: [`${featureRoot}/**/*.{ts,tsx}`],
      ignores: [
        `${featureRoot}/ui/**`,
        `${featureRoot}/data/schema.server.ts`,
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              ...workspaceImportRestrictionPatterns,
              ...platformAppImportRestrictionPatterns,
              crossFeatureImportRestriction,
            ],
          },
        ],
        "no-restricted-syntax": [
          "error",
          ...workspaceImportSyntaxRestrictions,
          ...platformAppImportSyntaxRestrictions,
          crossFeatureImportSyntaxRestriction,
        ],
      },
    },
    // R6 + R3: this feature's ui/** must not import this (or any) feature's
    // data/api/email, and must not reach into another feature's internals
    // either.
    {
      files: [`${featureRoot}/ui/**/*.{ts,tsx}`],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              ...workspaceImportRestrictionPatterns,
              ...platformAppImportRestrictionPatterns,
              featureUiServerImportRestriction,
              crossFeatureImportRestriction,
            ],
          },
        ],
        "no-restricted-syntax": [
          "error",
          ...workspaceImportSyntaxRestrictions,
          ...platformAppImportSyntaxRestrictions,
          featureUiServerImportSyntaxRestriction,
          crossFeatureImportSyntaxRestriction,
        ],
      },
    },
    // R3 + foreign-key carve-out: only data/schema.server.ts may import
    // another feature's data/schema.server.ts, to declare a foreign key.
    {
      files: [`${featureRoot}/data/schema.server.ts`],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              ...workspaceImportRestrictionPatterns,
              ...platformAppImportRestrictionPatterns,
              dataSchemaCrossFeatureImportRestriction,
            ],
          },
        ],
        "no-restricted-syntax": [
          "error",
          ...workspaceImportSyntaxRestrictions,
          ...platformAppImportSyntaxRestrictions,
          dataSchemaCrossFeatureImportSyntaxRestriction,
        ],
      },
    },
  ];
}

// Every feature under `apps/platform/src/features/`. Scaffolding a feature
// means adding its name here — the trio is generated. Forgetting is the
// failure mode that matters, because an unfenced feature lints green, so
// `tools/lint-boundaries.test.mjs` fails when this list and the feature
// directories disagree, and proves the generated rules actually fire.
export const BOUNDARY_FENCED_FEATURES = ["store", "waitlist"];

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
  {
    files: ["apps/platform/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...workspaceImportRestrictionPatterns,
            ...platformAppImportRestrictionPatterns,
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...workspaceImportSyntaxRestrictions,
        ...platformAppImportSyntaxRestrictions,
      ],
    },
  },
  ...BOUNDARY_FENCED_FEATURES.flatMap(createFeatureBoundaryConfigs),
];
