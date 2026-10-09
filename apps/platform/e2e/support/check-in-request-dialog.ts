import { expect, type Page, type Request } from "@playwright/test";

import { clockTimeOf, dayNameOf, spacedPattern } from "./check-in-moments";

export type RequestedCheckIn = { startsAt: Date; timeZone: string };

const TITLE = "Request a check-in";
const CLOCK_TIME = /^\d{1,2}:\d{2}/;
const REQUEST_STEP = /^Request \d{1,2}:\d{2}/;
const REQUESTS_API = /^\/api\/check-ins(\.data)?$/;

export class CheckInRequestDialog {
  constructor(private readonly page: Page) {}

  private get dialog() {
    return this.page.getByRole("dialog", { name: TITLE });
  }

  private get days() {
    return this.dialog.getByRole("grid", { name: /^Available days/ });
  }

  private static isCheckInRequest(request: Request): boolean {
    return (
      request.method() === "POST" &&
      REQUESTS_API.test(new URL(request.url()).pathname)
    );
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(
      this.dialog.getByRole("heading", { level: 3, name: TITLE }),
    ).toBeFocused();
    await expect(this.days).toBeVisible();
  }

  async expectClosed(): Promise<void> {
    await expect(this.dialog).toBeHidden();
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  async requestSoonest(note: string): Promise<RequestedCheckIn> {
    await this.days.getByRole("button", { disabled: false }).first().click();
    await this.dialog.getByRole("button", { name: CLOCK_TIME }).first().click();
    await this.dialog
      .getByLabel("Add a note for your coach (optional)")
      .fill(note);
    const sent = this.page.waitForRequest(
      CheckInRequestDialog.isCheckInRequest,
    );
    await this.dialog.getByRole("button", { name: REQUEST_STEP }).click();
    const body = (await sent).postDataJSON() as RequestedCheckInBody;
    await this.expectClosed();

    return { startsAt: new Date(body.startsAt), timeZone: body.timeZone };
  }

  async expectOffers(requested: RequestedCheckIn): Promise<void> {
    const { startsAt, timeZone } = requested;

    await this.days
      .getByRole("button", {
        name: new RegExp(`^${spacedPattern(dayNameOf(startsAt, timeZone))}`),
      })
      .click();
    await expect(
      this.dialog.getByRole("button", {
        name: new RegExp(`^${spacedPattern(clockTimeOf(startsAt, timeZone))}$`),
      }),
    ).toBeVisible();
  }
}

type RequestedCheckInBody = { startsAt: string; timeZone: string };
