import { expect, type Locator, type Page } from "@playwright/test";

import { checkInTab, type CheckInTab } from "./check-in-tabs";
import { isFocused, tabTo } from "./keyboard";
import { escapedPattern, HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type CheckInFilter = "Kind" | "Waiting on";

export type OptionCounts = Readonly<Record<string, number>>;

export type CountedOption = { label: string; count: number };

export type SortReading = {
  direction: "Soonest first" | "Latest first";
  toggle: "pressed" | "released";
};

export type AddressParams = Readonly<Record<string, string>>;

const SORT_KEY_LABEL = "Check-in date";
const DIRECTION_LABEL = /^(Soonest first|Latest first)$/;
const PAGE_PARAM = "page";
const NO_MATCH_TITLE = "No check-ins match";
const NO_MATCH_HINT = "Try another filter or search.";
const KEYBOARD_REACH_TIMEOUT_MS = 10_000;

function filterTrigger(page: Page, filter: CheckInFilter): Locator {
  return page.getByRole("combobox", { name: filter, exact: true });
}

function listbox(page: Page): Locator {
  return page.getByRole("listbox");
}

function countedName(option: CountedOption): RegExp {
  return new RegExp(`^${escapedPattern(option.label)}\\s*${option.count}$`);
}

function optionLabelled(page: Page, label: string): Locator {
  return listbox(page).getByRole("option", {
    name: new RegExp(`^${escapedPattern(label)}\\s*\\d+$`),
  });
}

function sortTrigger(page: Page): Locator {
  return page.getByRole("combobox", { name: "Sort by", exact: true });
}

function directionToggle(page: Page): Locator {
  return page.getByRole("button", { name: DIRECTION_LABEL });
}

function pageLink(page: Page, pageNumber: number): Locator {
  return page
    .getByRole("navigation", { name: "pagination" })
    .getByRole("link", { name: `Go to page ${pageNumber}`, exact: true });
}

function clearFiltersButton(page: Page): Locator {
  return page.getByRole("button", { name: "Clear filters", exact: true });
}

function noMatchTitle(page: Page): Locator {
  return page.getByText(NO_MATCH_TITLE, { exact: true });
}

async function tabFromHeadingTo(page: Page, control: Locator): Promise<void> {
  await page
    .getByRole("heading", { level: 1 })
    .click({ position: { x: 1, y: 1 } });
  await tabTo(page, control);
}

async function pressUntilFocused(
  page: Page,
  { key, target }: { key: string; target: Locator },
): Promise<void> {
  await expect(async () => {
    if (await isFocused(target)) return;
    await page.keyboard.press(key);
    await expect(target).toBeFocused({ timeout: HYDRATION_RETRY_TIMEOUT_MS });
  }).toPass({ timeout: KEYBOARD_REACH_TIMEOUT_MS });
}

async function openFilter(page: Page, filter: CheckInFilter): Promise<void> {
  await expect(async () => {
    await filterTrigger(page, filter).click();
    await expect(listbox(page)).toBeVisible({
      timeout: HYDRATION_RETRY_TIMEOUT_MS,
    });
  }).toPass();
}

async function openFilterByKeyboard(
  page: Page,
  filter: CheckInFilter,
): Promise<void> {
  await expect(async () => {
    await tabFromHeadingTo(page, filterTrigger(page, filter));
    await page.keyboard.press("Enter");
    await expect(listbox(page)).toBeVisible({
      timeout: HYDRATION_RETRY_TIMEOUT_MS,
    });
  }).toPass();
}

async function closeFilter(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await expect(listbox(page)).toBeHidden();
}

async function expectOnPage(page: Page, pageNumber: number): Promise<void> {
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get(PAGE_PARAM) ===
      (pageNumber === 1 ? null : `${pageNumber}`),
  );
}

async function expectDirectionChangedFrom(
  page: Page,
  before: string | null,
): Promise<void> {
  await expect(directionToggle(page)).not.toHaveAccessibleName(before ?? "", {
    timeout: HYDRATION_RETRY_TIMEOUT_MS,
  });
}

export async function chooseFilter(
  page: Page,
  filter: CheckInFilter,
  label: string,
): Promise<void> {
  await openFilter(page, filter);
  await optionLabelled(page, label).click();
  await expect(listbox(page)).toBeHidden();
  await expect(filterTrigger(page, filter)).toHaveText(label);
}

export async function chooseFilterByKeyboard(
  page: Page,
  filter: CheckInFilter,
  option: CountedOption,
): Promise<void> {
  const target = listbox(page).getByRole("option", {
    name: countedName(option),
  });

  await openFilterByKeyboard(page, filter);
  await expect(
    listbox(page).getByRole("option", { selected: true }),
  ).toBeFocused();
  await pressUntilFocused(page, { key: "ArrowDown", target });
  await expect(target).toHaveAccessibleName(countedName(option));
  await page.keyboard.press("Enter");
  await expect(listbox(page)).toBeHidden();
  await expect(filterTrigger(page, filter)).toHaveText(option.label);
  await expect(filterTrigger(page, filter)).toBeFocused();
}

export async function expectFilterReads(
  page: Page,
  filter: CheckInFilter,
  label: string,
): Promise<void> {
  await expect(filterTrigger(page, filter)).toHaveText(label);
}

export async function expectOptionCounts(
  page: Page,
  filter: CheckInFilter,
  counts: OptionCounts,
): Promise<void> {
  const entries = Object.entries(counts);

  await openFilter(page, filter);
  await expect(listbox(page).getByRole("option")).toHaveCount(entries.length);
  for (const [label, count] of entries) {
    await expect(optionLabelled(page, label)).toHaveAccessibleName(
      countedName({ label, count }),
    );
  }
  await closeFilter(page);
}

export async function expectSortReads(
  page: Page,
  { direction, toggle }: SortReading,
): Promise<void> {
  await expect(sortTrigger(page)).toHaveText(
    `${SORT_KEY_LABEL}: ${direction.toLowerCase()}`,
  );
  await expect(directionToggle(page)).toHaveAccessibleName(direction);
  await expect(directionToggle(page)).toHaveAttribute(
    "aria-pressed",
    `${toggle === "pressed"}`,
  );
}

export async function toggleSortDirection(page: Page): Promise<void> {
  const before = await directionToggle(page).getAttribute("aria-label");

  await expect(async () => {
    await directionToggle(page).click();
    await expectDirectionChangedFrom(page, before);
  }).toPass();
}

export async function toggleSortDirectionByKeyboard(page: Page): Promise<void> {
  const before = await directionToggle(page).getAttribute("aria-label");

  await expect(async () => {
    await tabFromHeadingTo(page, sortTrigger(page));
    await page.keyboard.press("Tab");
    await expect(directionToggle(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expectDirectionChangedFrom(page, before);
  }).toPass();
}

export async function showTabByKeyboard(
  page: Page,
  tab: CheckInTab,
): Promise<void> {
  const target = checkInTab(page, tab);

  await tabFromHeadingTo(page, page.getByRole("tab", { selected: true }));
  await pressUntilFocused(page, { key: "ArrowRight", target });
  await expect(target).toHaveAttribute("aria-selected", "true");
}

export async function goToPage(page: Page, pageNumber: number): Promise<void> {
  await pageLink(page, pageNumber).click();
  await expectOnPage(page, pageNumber);
}

export async function goToPageByKeyboard(
  page: Page,
  pageNumber: number,
): Promise<void> {
  await tabFromHeadingTo(page, pageLink(page, pageNumber));
  await page.keyboard.press("Enter");
  await expectOnPage(page, pageNumber);
}

export async function expectShowing(page: Page, text: string): Promise<void> {
  await expect(page.getByText(text, { exact: true })).toBeVisible();
}

export async function expectNoMatch(page: Page): Promise<void> {
  await expect(noMatchTitle(page)).toBeVisible();
  await expect(page.getByText(NO_MATCH_HINT, { exact: true })).toBeVisible();
  await expect(clearFiltersButton(page)).toBeVisible();
}

export async function clearFilters(page: Page): Promise<void> {
  await expect(async () => {
    await clearFiltersButton(page).click();
    await expect(noMatchTitle(page)).toBeHidden({
      timeout: HYDRATION_RETRY_TIMEOUT_MS,
    });
  }).toPass();
}

export async function expectAddressParams(
  page: Page,
  path: string,
  params: AddressParams,
): Promise<void> {
  await expect
    .poll(() => {
      const address = new URL(page.url());

      return {
        path: address.pathname,
        params: Object.fromEntries(address.searchParams),
      };
    })
    .toEqual({ path, params });
}
