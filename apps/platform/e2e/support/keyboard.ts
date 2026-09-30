import type { Locator, Page } from "@playwright/test";

const MAX_TAB_STOPS = 80;

export async function isFocused(locator: Locator): Promise<boolean> {
  return locator.evaluate(
    (element) =>
      element === document.activeElement ||
      element.contains(document.activeElement),
  );
}

export async function tabTo(page: Page, locator: Locator): Promise<void> {
  for (let stop = 0; stop < MAX_TAB_STOPS; stop += 1) {
    if (await isFocused(locator)) return;
    await page.keyboard.press("Tab");
  }

  throw new Error("The keyboard never reached the expected control.");
}
