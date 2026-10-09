import { expect, type Page, type Request } from "@playwright/test";

import { clockTimeOf, dayNameOf, spacedPattern } from "./check-in-moments";
import { tabTo } from "./keyboard";

export type RequestedCheckIn = { startsAt: Date; timeZone: string };

const TITLE = "Request a check-in";
const CLOCK_TIME = /^\d{1,2}:\d{2}/;
const REQUEST_STEP = /^Request \d{1,2}:\d{2}/;
const TIME_TAKEN = "That time is no longer free. Pick another one.";
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

  private get noteField() {
    return this.dialog.getByLabel("Add a note for your coach (optional)");
  }

  private async chooseSoonestTime(): Promise<void> {
    await this.dialog.getByRole("button", { name: CLOCK_TIME }).first().click();
  }

  async chooseSoonest(note: string): Promise<void> {
    await this.days.getByRole("button", { disabled: false }).first().click();
    await this.chooseSoonestTime();
    await this.noteField.fill(note);
  }

  async send(): Promise<RequestedCheckIn> {
    const sent = this.page.waitForRequest(
      CheckInRequestDialog.isCheckInRequest,
    );
    await this.dialog.getByRole("button", { name: REQUEST_STEP }).click();
    const body = (await sent).postDataJSON() as RequestedCheckInBody;

    return { startsAt: new Date(body.startsAt), timeZone: body.timeZone };
  }

  async requestSoonest(note: string): Promise<RequestedCheckIn> {
    await this.chooseSoonest(note);
    const requested = await this.send();
    await this.expectClosed();

    return requested;
  }

  async requestSoonestByKeyboard(note: string): Promise<RequestedCheckIn> {
    const keyboard = this.page.keyboard;

    await tabTo(
      this.page,
      this.days.getByRole("button", { disabled: false }).first(),
    );
    await keyboard.press("Enter");
    await tabTo(
      this.page,
      this.dialog.getByRole("button", { name: CLOCK_TIME }).first(),
    );
    await keyboard.press("Enter");
    await tabTo(this.page, this.noteField);
    await keyboard.type(note);
    await tabTo(
      this.page,
      this.dialog.getByRole("button", { name: REQUEST_STEP }),
    );
    const sent = this.page.waitForRequest(
      CheckInRequestDialog.isCheckInRequest,
    );
    await keyboard.press("Enter");
    const body = (await sent).postDataJSON() as RequestedCheckInBody;
    await this.expectClosed();

    return { startsAt: new Date(body.startsAt), timeZone: body.timeZone };
  }

  async requestAnotherTime(): Promise<RequestedCheckIn> {
    await this.chooseSoonestTime();
    const requested = await this.send();
    await this.expectClosed();

    return requested;
  }

  async expectTimeTaken(note: string): Promise<void> {
    await expect(this.dialog.getByText(TIME_TAKEN)).toBeVisible();
    await expect(this.noteField).toHaveValue(note);
  }

  async expectDayUnavailable(instant: Date, timeZone: string): Promise<void> {
    await expect(
      this.days.getByRole("button", {
        name: new RegExp(spacedPattern(dayNameOf(instant, timeZone))),
      }),
    ).toBeDisabled();
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
