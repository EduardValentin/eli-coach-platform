import { expect, type Locator, type Page } from "@playwright/test";

import { expectAccessRefused } from "./control-states";
import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type ResourcesOwner = {
  clientId: string;
  firstName: string;
  fullName: string;
};

export type ResourceCardFacts = {
  title: string;
  type: string;
  pages?: number;
};

const ADD_RESOURCE = "Add resource";

export class CoachClientResourcesPage {
  constructor(private readonly page: Page) {}

  private get addButton() {
    return this.page.getByRole("button", { name: ADD_RESOURCE, exact: true });
  }

  private get addDialog() {
    return this.page.getByRole("dialog", { name: ADD_RESOURCE });
  }

  private get resources() {
    return this.page.getByRole("region", { name: "Resources", exact: true });
  }

  private get cards() {
    return this.resources.getByRole("button");
  }

  private card(title: string): Locator {
    return this.resources.getByRole("button", { name: title, exact: true });
  }

  private viewerFor(title: string): Locator {
    return this.page.getByRole("dialog", { name: title, exact: true });
  }

  private backLinkTo(fullName: string): Locator {
    return this.page.getByRole("link", { name: `Back to ${fullName}` });
  }

  private async openDialogWith(
    trigger: Locator,
    dialog: Locator,
  ): Promise<void> {
    await expect(async () => {
      await trigger.click();
      await expect(dialog).toBeVisible({ timeout: HYDRATION_RETRY_TIMEOUT_MS });
    }).toPass();
  }

  async open(clientId: string): Promise<void> {
    await this.page.goto(`/coach/clients/${clientId}/resources`);
  }

  async expectOpenFor(owner: ResourcesOwner): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`/coach/clients/${owner.clientId}/resources$`),
    );
    await expect(
      this.page.getByRole("heading", {
        level: 1,
        name: `${owner.firstName}’s resources`,
      }),
    ).toBeVisible();
    await expect(this.backLinkTo(owner.fullName)).toHaveAttribute(
      "href",
      `/coach/clients/${owner.clientId}`,
    );
  }

  async goBack(fullName: string): Promise<void> {
    await this.backLinkTo(fullName).click();
  }

  async expectEmpty(firstName: string): Promise<void> {
    await expect(
      this.page.getByText("No resources yet", { exact: true }),
    ).toBeVisible();
    await expect(
      this.page.getByText(
        `Share a guide, a plan or a photo with ${firstName}.`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(this.addButton).toHaveCount(1);
    await expect(this.resources).toHaveCount(0);
  }

  async expectCards(titles: readonly string[]): Promise<void> {
    await expect(this.cards).toHaveCount(titles.length);

    for (const [position, title] of titles.entries()) {
      await expect(this.cards.nth(position)).toHaveAccessibleName(title);
    }

    await expect(this.addButton).toHaveCount(1);
  }

  async expectCard({ title, type, pages }: ResourceCardFacts): Promise<void> {
    await expect(this.card(title)).toHaveAccessibleDescription(
      pages ? `${type} ${pages} pages` : type,
    );
  }

  async expectThumbnail(title: string): Promise<void> {
    const thumbnail = this.card(title).locator("img");

    await expect
      .poll(() =>
        thumbnail.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }

  async expectCover(title: string): Promise<void> {
    await expect(this.card(title)).toBeVisible();
    await expect(this.card(title).locator("img")).toHaveCount(0);
  }

  async openAdd(): Promise<void> {
    await this.openDialogWith(this.addButton, this.addDialog);
  }

  async openAddWithKeyboard(): Promise<void> {
    await expect(async () => {
      await this.page
        .getByRole("heading", { level: 1 })
        .click({ position: { x: 1, y: 1 } });
      await tabTo(this.page, this.addButton);
      await this.page.keyboard.press("Enter");
      await expect(this.addDialog).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async openResource(title: string): Promise<void> {
    await this.openDialogWith(this.card(title), this.viewerFor(title));
  }

  async openResourceWithKeyboard(title: string): Promise<void> {
    await tabTo(this.page, this.card(title));
    await this.page.keyboard.press("Enter");
    await expect(this.viewerFor(title)).toBeVisible();
  }

  async expectFocusOn(title: string): Promise<void> {
    await expect(this.card(title)).toBeFocused();
  }

  async expectAddFocused(): Promise<void> {
    await expect(this.addButton).toBeFocused();
  }

  async expectUnavailable(fullName: string): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Resources didn’t load" }),
    ).toBeVisible();
    await expect(
      this.page.getByText(
        "Something went wrong on our side. Try again in a moment.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(this.backLinkTo(fullName)).toBeVisible();
    await expect(this.addButton).toHaveCount(0);
  }

  async retry(): Promise<void> {
    await this.page.getByRole("button", { name: "Try again" }).click();
  }

  async expectClientNotFound(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Client not found" }),
    ).toBeVisible();
  }

  async expectRefused(): Promise<void> {
    await expectAccessRefused(this.page);
  }
}
