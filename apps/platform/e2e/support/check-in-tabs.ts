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

export type JoinEmphasis = "emphasised" | "quiet";

const EMPHASISED_JOIN = /\bbg-primary\b/;

export async function expectCheckInsInOrder(
  page: Page,
  tab: CheckInTab,
  showing: readonly string[],
): Promise<void> {
  const listed = checkInsListed(page, tab);

  await showCheckInTab(page, tab);
  await expect(listed).toHaveCount(showing.length);
  for (const [position, text] of showing.entries()) {
    await expect(listed.nth(position)).toContainText(text);
  }
}

export async function expectEmptyCheckInTab(
  page: Page,
  tab: CheckInTab,
  title: string,
): Promise<void> {
  await showCheckInTab(page, tab);
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(checkInsListed(page, tab)).toHaveCount(0);
}

export async function expectJoinEmphasis(
  row: Locator,
  emphasis: JoinEmphasis,
): Promise<void> {
  const join = row.getByRole("link", { name: "Join Meet" });

  await expect(join).toBeVisible();
  if (emphasis === "emphasised") {
    await expect(join).toHaveClass(EMPHASISED_JOIN);
    return;
  }
  await expect(join).not.toHaveClass(EMPHASISED_JOIN);
}
