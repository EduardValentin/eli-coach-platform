import { expect, type Page } from "@playwright/test";

async function headingLevels(page: Page): Promise<number[]> {
  return page
    .getByRole("heading")
    .evaluateAll((headings) =>
      headings.map((heading) => Number(heading.tagName.slice(1)) || 0),
    );
}

function countOfH1s(levels: readonly number[]): number {
  return levels.filter((level) => level === 1).length;
}

export async function expectOneH1(page: Page): Promise<void> {
  await expect.poll(async () => countOfH1s(await headingLevels(page))).toBe(1);
}

export async function expectOneH1AndNoSkippedLevels(page: Page): Promise<void> {
  const levels = await headingLevels(page);
  const skipped = levels.filter(
    (level, index) => index > 0 && level > levels[index - 1]! + 1,
  );

  expect(countOfH1s(levels)).toBe(1);
  expect(skipped).toEqual([]);
}
