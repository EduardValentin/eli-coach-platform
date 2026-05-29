import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
import { platformImportRules } from "./tools/eslint-rules/platform-imports.mjs";

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
      local: {
        rules: platformImportRules,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // TypeScript owns symbol resolution; these core JS rules report false positives on TS syntax.
      "no-undef": "off",
      "no-unused-vars": "off",
      ...jsxA11y.flatConfigs.strict.rules,
      "local/no-workspace-relative-imports": "error",
    },
  },
  {
    files: ["apps/platform/app/**/*.{ts,tsx}"],
    rules: {
      "local/prefer-platform-app-alias": "error",
    },
  },
];
