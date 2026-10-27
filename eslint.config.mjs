import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

const appAliasMessage =
  "Use the app root alias for app-local imports that cross multiple directories.";

const xmlHttpRequestRestriction = {
  message:
    "An upload with progress goes through uploadOutcomeOf from ~/shared/http in the resource route's clientAction; nothing else sends XMLHttpRequest (see conventions.md, Client state).",
  name: "XMLHttpRequest",
};

export default [
  {
    ignores: [
      "**/build/**",
      "**/coverage/**",
      "**/.react-router/**",
      "**/.turbo/**",
      "apps/*/public/**",
      "designs/**",
      "tools/boundary-fixtures/**",
    ],
  },
  {
    files: ["apps/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: { ...globals.browser, ...globals.node },
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" },
    },
    plugins: { "jsx-a11y": jsxA11y },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "off",
      "no-unused-vars": "off",
      ...jsxA11y.flatConfigs.strict.rules,
    },
  },
  {
    files: ["apps/platform/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              message: appAliasMessage,
              regex: "^\\.\\.\\/\\.\\.\\/.+",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          message: appAliasMessage,
          selector: "ImportExpression[source.value=/^\\.\\.\\/\\.\\.\\/.+/]",
        },
      ],
    },
  },
  // React Router's route-config loader resolves these two without the app's
  // tsconfig alias, so they are the only app-local modules that reach across
  // directories relatively: a surface's route registry, and the path literals
  // a feature's route fragment reads.
  {
    files: [
      "apps/platform/src/surfaces/*/routes.ts",
      "apps/platform/src/bounded-contexts/*/*/routes.ts",
      "apps/platform/src/bounded-contexts/*/*/public/paths.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
  // The shared upload transport is the one XMLHttpRequest sender, so the
  // global is refused in every component's ui/ and adapters/inbound/http/
  // and every surface.
  {
    files: [
      "apps/platform/src/bounded-contexts/*/*/ui/**/*.{ts,tsx}",
      "apps/platform/src/bounded-contexts/*/*/adapters/inbound/http/**/*.{ts,tsx}",
      "apps/platform/src/surfaces/**/*.{ts,tsx}",
    ],
    ignores: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error", xmlHttpRequestRestriction],
    },
  },
  // A write that ends a user action goes through a React Router fetcher or
  // route action; raw fetch in browser code is reserved for named background
  // sync (today: the onboarding draft autosave), which is excluded below.
  // This block replaces the options of the one above for the same files, so
  // XMLHttpRequest is refused here again.
  {
    files: [
      "apps/platform/src/bounded-contexts/*/*/ui/**/*.{ts,tsx}",
      "apps/platform/src/surfaces/**/*.{ts,tsx}",
    ],
    ignores: [
      "**/*.test.{ts,tsx}",
      "apps/platform/src/bounded-contexts/clients/client-profile/ui/client/onboarding/draft-autosave-requests.ts",
    ],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          message:
            "Browser writes go through useFetcher or a route action against the feature's resource route; raw fetch is only for named background sync (see conventions.md, Client state).",
          name: "fetch",
        },
        xmlHttpRequestRestriction,
      ],
    },
  },
  {
    files: [
      "apps/platform/src/bounded-contexts/programs/exercise-library/ui/coach/exercises/exercise-video-field.tsx",
    ],
    rules: {
      "jsx-a11y/media-has-caption": "off",
    },
  },
];
