import { expect, type Locator } from "@playwright/test";

/**
 * Playwright's actionability checks cannot tell a hydrated control from a
 * server-rendered one; React's own instance property on the element can.
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
