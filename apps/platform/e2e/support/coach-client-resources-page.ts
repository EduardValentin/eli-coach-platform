import { expect, type Locator, type Page } from "@playwright/test";

import { expectAccessRefused } from "./control-states";
import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";
import { ResourceCards, type ResourceCardFacts } from "./resource-cards";

export type ResourcesOwner = {
  clientId: string;
  firstName: string;
  fullName: string;
};

type ResourceAction = "Edit details" | "Delete";

const ADD_RESOURCE = "Add resource";

export class CoachClientResourcesPage {
  private readonly cards: ResourceCards;

  constructor(private readonly page: Page) {
    this.cards = new ResourceCards(page);
  }

  private get addButton() {
    return this.page.getByRole("button", { name: ADD_RESOURCE, exact: true });
  }

  private get addDialog() {
    return this.page.getByRole("dialog", { name: ADD_RESOURCE });
  }

  private backLinkTo(fullName: string): Locator {
    return this.page.getByRole("link", { name: `Back to ${fullName}` });
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

  async reload(): Promise<void> {
    await this.page.reload();
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
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
    await this.cards.expectNone();
  }

  async expectCards(titles: readonly string[]): Promise<void> {
    await this.cards.expectListed(titles);
    await expect(this.addButton).toHaveCount(1);
  }

  async expectCard(facts: ResourceCardFacts): Promise<void> {
    await this.cards.expectCard(facts);
  }

  async expectMetaRowOnOneLine(title: string): Promise<void> {
    await this.cards.expectMetaRowOnOneLine(title);
  }

  async expectThumbnail(title: string): Promise<void> {
    await this.cards.expectThumbnail(title);
  }

  async expectCover(title: string): Promise<void> {
    await this.cards.expectCover(title);
  }

  async openAdd(): Promise<void> {
    await expect(async () => {
      await this.addButton.click();
      await expect(this.addDialog).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
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

  async chooseAction(title: string, action: ResourceAction): Promise<void> {
    const menuItem = this.page.getByRole("menuitem", {
      name: action,
      exact: true,
    });

    await expect(async () => {
      await this.page
        .getByRole("button", { name: `Actions for ${title}`, exact: true })
        .click();
      await expect(menuItem).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await menuItem.click();
  }

  async expectToast(message: string): Promise<void> {
    await expect(this.page.getByText(message, { exact: true })).toBeVisible();
  }

  async openResource(title: string): Promise<void> {
    await this.cards.open(title);
  }

  async openResourceWithKeyboard(title: string): Promise<void> {
    await this.cards.openWithKeyboard(title);
  }

  async expectFocusOn(title: string): Promise<void> {
    await this.cards.expectFocusOn(title);
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
