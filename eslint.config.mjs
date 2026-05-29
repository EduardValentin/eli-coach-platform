import tsParser from "@typescript-eslint/parser";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
import local from "./tools/eslint-rules/index.mjs";

export default [
  {
    ignores: [
      "**/build/**",
      "**/coverage/**",
      "**/.react-router/**",
      "**/.turbo/**",
      "**/public/**",
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
      local,
    },
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      "local/no-workspace-relative-imports": "error",
    },
  },
  {
    files: ["apps/platform/app/**/*.{ts,tsx}"],
    rules: {
      "local/no-global-container-outside-routes": "error",
      "local/prefer-platform-app-alias": "error",
    },
  },
  {
    files: ["apps/platform/app/modules/**/*controller.server.{ts,tsx}"],
    rules: {
      "local/no-controller-instance-state": "error",
    },
  },
  {
    files: ["apps/platform/app/routes/**/*.{ts,tsx}"],
    rules: {
      "local/api-routes-use-container-controllers": "error",
    },
  },
];
