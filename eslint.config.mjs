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
// so each feature gets its own trio of blocks below (self-excluded by
// name). Only `waitlist` exists today; add the next feature's trio,
// swapping its name in, when a second feature is scaffolded.
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
const waitlistCrossFeatureImportRestriction =
  createFeatureCrossImportRestriction("waitlist");
const waitlistCrossFeatureImportSyntaxRestriction =
  createFeatureCrossImportSyntaxRestriction("waitlist");
const waitlistDataSchemaCrossFeatureImportRestriction = createFeatureCrossImportRestriction(
  "waitlist",
  { exemptSubpaths: ["data\\/schema\\.server$"] },
);
const waitlistDataSchemaCrossFeatureImportSyntaxRestriction = createFeatureCrossImportSyntaxRestriction(
  "waitlist",
  { exemptSubpaths: ["data\\/schema\\.server$"] },
);

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
      "**/__lint__/**",
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
  // R3 (non-ui, non-schema files): the waitlist feature must not reach into
  // another feature's internals. `ui/**` and `data/schema.server.ts` are
  // handled by the two more specific blocks below, which also fold in R6
  // and the foreign-key carve-out respectively.
  {
    files: ["apps/platform/src/features/waitlist/**/*.{ts,tsx}"],
    ignores: [
      "apps/platform/src/features/waitlist/ui/**",
      "apps/platform/src/features/waitlist/data/schema.server.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...workspaceImportRestrictionPatterns,
            ...platformAppImportRestrictionPatterns,
            waitlistCrossFeatureImportRestriction,
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...workspaceImportSyntaxRestrictions,
        ...platformAppImportSyntaxRestrictions,
        waitlistCrossFeatureImportSyntaxRestriction,
      ],
    },
  },
  // R6 + R3: the waitlist feature's ui/** must not import this (or any)
  // feature's data/api/email, and must not reach into another feature's
  // internals either.
  {
    files: ["apps/platform/src/features/waitlist/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...workspaceImportRestrictionPatterns,
            ...platformAppImportRestrictionPatterns,
            featureUiServerImportRestriction,
            waitlistCrossFeatureImportRestriction,
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...workspaceImportSyntaxRestrictions,
        ...platformAppImportSyntaxRestrictions,
        featureUiServerImportSyntaxRestriction,
        waitlistCrossFeatureImportSyntaxRestriction,
      ],
    },
  },
  // R3 + foreign-key carve-out: only data/schema.server.ts may import
  // another feature's data/schema.server.ts, to declare a foreign key.
  {
    files: ["apps/platform/src/features/waitlist/data/schema.server.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...workspaceImportRestrictionPatterns,
            ...platformAppImportRestrictionPatterns,
            waitlistDataSchemaCrossFeatureImportRestriction,
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...workspaceImportSyntaxRestrictions,
        ...platformAppImportSyntaxRestrictions,
        waitlistDataSchemaCrossFeatureImportSyntaxRestriction,
      ],
    },
  },
];
