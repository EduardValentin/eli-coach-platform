import { expect, type Page } from "@playwright/test";

export async function expectOneH1AndNoSkippedLevels(page: Page): Promise<void> {
  const levels = await page
    .getByRole("heading")
    .evaluateAll((headings) =>
      headings.map((heading) => Number(heading.tagName.slice(1)) || 0),
    );
  const h1Count = levels.filter((level) => level === 1).length;
  const skipped = levels.filter(
    (level, index) => index > 0 && level > levels[index - 1]! + 1,
  );

  expect(h1Count).toBe(1);
  expect(skipped).toEqual([]);
}
