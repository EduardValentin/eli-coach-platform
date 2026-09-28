import { devices, type Page } from "@playwright/test";

const PHONE_VIEWPORT = { height: 844, width: 390 };

export async function usePhoneViewport(page: Page): Promise<void> {
  await page.setViewportSize(PHONE_VIEWPORT);
}

export async function useDesktopViewport(page: Page): Promise<void> {
  await page.setViewportSize(devices["Desktop Chrome"].viewport);
}
