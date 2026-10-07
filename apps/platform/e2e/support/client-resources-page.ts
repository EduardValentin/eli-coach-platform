import { expect, type Page } from "@playwright/test";

import { ResourceCards, type ResourceCardFacts } from "./resource-cards";

const RESOURCES_PATH = "/client/resources";
const NEW_MARK = "New";
const OPENED_ROUTE = "**/api/client-resources/*/opened.data";
const MANAGEMENT_CONTROL = /\b(add|edit|delete|remove|replace|upload)\b/i;

export class ClientResourcesPage {
  private readonly cards: ResourceCards;

  constructor(private readonly page: Page) {
    this.cards = new ResourceCards(page);
  }

  private get heading() {
    return this.page.getByRole("heading", { level: 1 });
  }

  private get main() {
    return this.page.getByRole("main");
  }

  async open(): Promise<void> {
    await this.page.goto(RESOURCES_PATH);
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await expect(this.heading).toBeVisible();
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${RESOURCES_PATH}$`));
    await expect(this.heading).toHaveText(["Resources"]);
  }

  async expectCards(titles: readonly string[]): Promise<void> {
    await this.cards.expectListed(titles);
  }

  async expectNew(facts: ResourceCardFacts): Promise<void> {
    await this.cards.expectCard(facts, [NEW_MARK]);
  }

  async expectNotNew(facts: ResourceCardFacts): Promise<void> {
    await this.cards.expectCard(facts);
  }

  async expectThumbnail(title: string): Promise<void> {
    await this.cards.expectThumbnail(title);
  }

  async expectCover(title: string): Promise<void> {
    await this.cards.expectCover(title);
  }

  async expectColumns(count: number): Promise<void> {
    await this.cards.expectColumns(count);
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

  async expectNoManagementControls(): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: MANAGEMENT_CONTROL }),
    ).toHaveCount(0);
    await expect(
      this.page.getByRole("link", { name: MANAGEMENT_CONTROL }),
    ).toHaveCount(0);
  }

  async expectEmpty(): Promise<void> {
    await this.expectOpen();
    await expect(
      this.main.getByText("Nothing here yet", { exact: true }),
    ).toBeVisible();
    await expect(
      this.main.getByText(
        "When your coach shares a guide or a plan, it lands here.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(this.main.getByRole("button")).toHaveCount(0);
    await this.cards.expectNone();
  }

  async expectUnavailable(): Promise<void> {
    await expect(this.heading).toHaveText(["Resources didn’t load"]);
    await expect(
      this.main.getByText(
        "Something went wrong on our side. Try again in a moment.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      this.main.getByRole("button", { name: "Try again" }),
    ).toBeVisible();
    await this.cards.expectNone();
  }

  async retry(): Promise<void> {
    await this.main.getByRole("button", { name: "Try again" }).click();
  }

  async failNextOpening(): Promise<void> {
    await this.page.route(OPENED_ROUTE, (route) => route.abort("failed"), {
      times: 1,
    });
  }
}
