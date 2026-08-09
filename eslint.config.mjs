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

export default [
  {
    ignores: [
      "**/build/**",
      "**/coverage/**",
      "**/.react-router/**",
      "**/.turbo/**",
      "**/public/**",
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
];
