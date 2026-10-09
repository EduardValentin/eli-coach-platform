import { expect, type Locator, type Page } from "@playwright/test";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type CheckInTab = "Upcoming" | "Requests" | "Past";

const TAB_NAMES: Record<CheckInTab, RegExp> = {
  Upcoming: /^Upcoming$/,
  Requests: /^Requests/,
  Past: /^Past$/,
};

export function checkInTab(page: Page, tab: CheckInTab): Locator {
  return page.getByRole("tab", { name: TAB_NAMES[tab] });
}

export async function showCheckInTab(
  page: Page,
  tab: CheckInTab,
): Promise<void> {
  const trigger = checkInTab(page, tab);

  await expect(async () => {
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-selected", "true", {
      timeout: HYDRATION_RETRY_TIMEOUT_MS,
    });
  }).toPass();
}

export function checkInsListed(page: Page, tab: CheckInTab): Locator {
  return page
    .getByRole("list", { name: `${tab} check-ins` })
    .getByRole("listitem");
}
