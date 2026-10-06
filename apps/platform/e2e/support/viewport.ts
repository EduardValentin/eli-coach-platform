import { devices, expect, type Page } from "@playwright/test";

const PHONE_VIEWPORT = { height: 844, width: 390 };

export async function setPhoneViewport(page: Page): Promise<void> {
  await page.setViewportSize(PHONE_VIEWPORT);
}

export async function setDesktopViewport(page: Page): Promise<void> {
  await page.setViewportSize(devices["Desktop Chrome"].viewport);
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(0);
}
