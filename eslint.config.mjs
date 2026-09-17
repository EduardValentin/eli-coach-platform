import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

const appAliasMessage =
  "Use the app root alias for app-local imports that cross multiple directories.";

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
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
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
              regex: "^\\.\\.\\/\\.\\.\\/(?!.*\\/packages\\/).+",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          message: appAliasMessage,
          selector:
            "ImportExpression[source.value=/^\\.\\.\\/\\.\\.\\/(?!.*\\/packages\\/).+/]",
        },
      ],
    },
  },
  {
    files: ["apps/platform/src/surfaces/*/routes.ts"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
];
