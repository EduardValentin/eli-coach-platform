import { resolve } from "node:path";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..");
const eslint = new ESLint({ cwd: repositoryRoot });
const BACKGROUND_SAVE = 'export const save = () => fetch("/api/draft");\n';
const COMPONENTS = "apps/platform/src/bounded-contexts";

async function rawFetchRefusalsIn(filePath) {
  const [result] = await eslint.lintText(BACKGROUND_SAVE, { filePath });

  return result.messages
    .filter((message) => message.ruleId === "no-restricted-globals")
    .map((message) => message.message);
}

describe("raw fetch in browser code", () => {
  it.each([
    `${COMPONENTS}/programs/training-programs/ui/coach/program/program-builder.tsx`,
    `${COMPONENTS}/clients/client-profile/ui/client/onboarding/onboarding-wizard.tsx`,
    "apps/platform/src/surfaces/coach-portal/pages/client/client.tsx",
  ])("is refused in %s", async (filePath) => {
    // act
    const refusals = await rawFetchRefusalsIn(filePath);

    // assert
    expect(refusals).toEqual([
      expect.stringContaining("raw fetch is only for named background sync"),
    ]);
  });

  it.each([
    `${COMPONENTS}/clients/client-profile/ui/client/onboarding/draft-autosave-requests.ts`,
    `${COMPONENTS}/programs/training-programs/ui/coach/program/program-draft-save-requests.ts`,
  ])("is kept for the named background save in %s", async (filePath) => {
    // act
    const refusals = await rawFetchRefusalsIn(filePath);

    // assert
    expect(refusals).toEqual([]);
  });
});
