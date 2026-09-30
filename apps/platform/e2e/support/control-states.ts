import { expect, type Locator, type Page } from "@playwright/test";

export type Availability = "enabled" | "disabled";

export async function expectAvailability(
  control: Locator,
  availability: Availability,
): Promise<void> {
  if (availability === "disabled") {
    await expect(control).toBeDisabled();
    return;
  }

  await expect(control).toBeEnabled();
}

export async function expectAccessRefused(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "You don't have access to this page" }),
  ).toBeVisible();
}
