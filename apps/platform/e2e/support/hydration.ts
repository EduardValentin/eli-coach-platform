import { expect, type Locator } from "@playwright/test";

/**
 * A server-rendered control is visible, enabled and clickable long before
 * React attaches its handler, and Playwright's actionability checks cannot
 * tell the two apart. React marks an element it owns with an instance
 * property, so waiting for that property is waiting for the handler.
 */
export async function expectHydrated(control: Locator): Promise<void> {
  await expect
    .poll(() =>
      control.evaluate((element) =>
        Object.keys(element).some((key) => key.startsWith("__reactProps$")),
      ),
    )
    .toBe(true);
}
