import {
  expect,
  type Locator,
  type Page,
  type Request,
} from "@playwright/test";

import {
  clockTimeOf,
  dayNameOf,
  shortMomentOf,
  spacedPattern,
} from "./check-in-moments";
import { tabTo } from "./keyboard";
import { escapedPattern } from "./locator-text";

export type PickedCheckIn = { startsAt: Date; timeZone: string };

export type CheckInPickerKind = {
  title: string | RegExp;
  stepVerb: string;
  endpoint: RegExp;
};

export const CHECK_IN_REQUEST_PICKER: CheckInPickerKind = {
  title: "Request a check-in",
  stepVerb: "Request",
  endpoint: /^\/api\/check-ins(\.data)?$/,
};

export const CHECK_IN_SCHEDULE_PICKER: CheckInPickerKind = {
  title: /^Schedule a check-in with \S+$/,
  stepVerb: "Schedule",
  endpoint: /^\/api\/check-ins\/schedule(\.data)?$/,
};

export const CHECK_IN_PROPOSE_PICKER: CheckInPickerKind = {
  title: "Propose a new time",
  stepVerb: "Propose",
  endpoint: /^\/api\/check-ins\/[^/]+\/new-time(\.data)?$/,
};

const CLOCK_TIME = /^\d{1,2}:\d{2}/;
const NOTE_FIELD = /^Add a note for .+$/;
const TIME_TAKEN = "That time is no longer free. Pick another one.";
const SHEET_HANDLE = '[data-parity="sheet-handle"]';
const NEXT_MONTH = /next month/i;
const MONTHS_AHEAD = 2;

type PickedCheckInBody = { startsAt: string };

export class CheckInPickerDialog {
  private readonly stepButtonName: RegExp;

  constructor(
    private readonly page: Page,
    private readonly kind: CheckInPickerKind,
  ) {
    this.stepButtonName = new RegExp(
      `^${escapedPattern(kind.stepVerb)} \\d{1,2}:\\d{2}`,
    );
  }

  private get dialog() {
    return this.page.getByRole("dialog", { name: this.kind.title });
  }

  private get days() {
    return this.dialog.getByRole("grid", { name: /^Available days/ });
  }

  private get noteField() {
    return this.dialog.getByRole("textbox", { name: NOTE_FIELD });
  }

  private get stepButton() {
    return this.dialog.getByRole("button", { name: this.stepButtonName });
  }

  private isSubmission(request: Request): boolean {
    return (
      request.method() === "POST" &&
      this.kind.endpoint.test(new URL(request.url()).pathname)
    );
  }

  private async pickedFrom(sent: Promise<Request>): Promise<PickedCheckIn> {
    const body = (await sent).postDataJSON() as PickedCheckInBody;
    const timeZone = await this.page.evaluate(
      () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    );

    return { startsAt: new Date(body.startsAt), timeZone };
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(
      this.dialog.getByRole("heading", { level: 3, name: this.kind.title }),
    ).toBeFocused();
    await expect(this.days).toBeVisible();
  }

  async expectOpenAsSheet(): Promise<void> {
    await this.expectOpen();
    await expect(this.dialog.locator(SHEET_HANDLE)).toBeVisible();
    await expect
      .poll(async () => {
        const box = await this.dialog.boundingBox();
        const viewport = this.page.viewportSize();

        return box && viewport
          ? Math.round(viewport.height - (box.y + box.height))
          : null;
      })
      .toBe(0);
  }

  async expectNoteFor(recipient: string): Promise<void> {
    await expect(
      this.dialog.getByRole("textbox", {
        name: `Add a note for ${recipient}`,
        exact: true,
      }),
    ).toBeVisible();
  }

  async expectCurrentTime(current: PickedCheckIn): Promise<void> {
    await expect(this.dialog).toContainText(
      new RegExp(
        `Currently set for ${spacedPattern(shortMomentOf(current.startsAt, current.timeZone))}`,
      ),
    );
  }

  async expectClosed(): Promise<void> {
    await expect(this.dialog).toBeHidden();
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  private async chooseSoonestTime(): Promise<void> {
    await this.dialog.getByRole("button", { name: CLOCK_TIME }).first().click();
  }

  async chooseSoonest(note: string): Promise<void> {
    await this.days.getByRole("button", { disabled: false }).first().click();
    await this.chooseSoonestTime();
    await this.noteField.fill(note);
  }

  async send(): Promise<PickedCheckIn> {
    const sent = this.page.waitForRequest((request) =>
      this.isSubmission(request),
    );
    await this.stepButton.click();

    return this.pickedFrom(sent);
  }

  async sendSoonest(note: string): Promise<PickedCheckIn> {
    await this.chooseSoonest(note);
    const picked = await this.send();
    await this.expectClosed();

    return picked;
  }

  async sendSoonestByKeyboard(note: string): Promise<PickedCheckIn> {
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
    await tabTo(this.page, this.stepButton);
    const sent = this.page.waitForRequest((request) =>
      this.isSubmission(request),
    );
    await keyboard.press("Enter");
    const picked = await this.pickedFrom(sent);
    await this.expectClosed();

    return picked;
  }

  async sendAnotherTime(): Promise<PickedCheckIn> {
    await this.chooseSoonestTime();
    const picked = await this.send();
    await this.expectClosed();

    return picked;
  }

  async expectTimeTaken(note: string): Promise<void> {
    await expect(this.dialog.getByText(TIME_TAKEN)).toBeVisible();
    await expect(this.noteField).toHaveValue(note);
  }

  private async showMonthOf(day: Locator): Promise<void> {
    await expect(this.days.getByRole("button").first()).toBeVisible();

    for (
      let shown = 0;
      shown < MONTHS_AHEAD && (await day.count()) === 0;
      shown += 1
    ) {
      await this.dialog.getByRole("button", { name: NEXT_MONTH }).click();
    }
  }

  async expectDayUnavailable(instant: Date, timeZone: string): Promise<void> {
    const day = this.days.getByRole("button", {
      name: new RegExp(spacedPattern(dayNameOf(instant, timeZone))),
    });

    await this.showMonthOf(day);
    await expect(day).toBeDisabled();
  }

  private async timeOn(picked: PickedCheckIn): Promise<Locator> {
    const { startsAt, timeZone } = picked;
    const day = this.days.getByRole("gridcell", {
      name: new RegExp(`^${spacedPattern(dayNameOf(startsAt, timeZone))}`),
    });

    if ((await day.getAttribute("aria-selected")) !== "true") {
      await day.getByRole("button").click();
    }
    await expect(
      this.dialog.getByRole("button", { name: CLOCK_TIME }).first(),
    ).toBeVisible();

    return this.dialog.getByRole("button", {
      name: new RegExp(`^${spacedPattern(clockTimeOf(startsAt, timeZone))}$`),
    });
  }

  async expectOffers(picked: PickedCheckIn): Promise<void> {
    await expect(await this.timeOn(picked)).toBeVisible();
  }

  async expectNotOffered(picked: PickedCheckIn): Promise<void> {
    await expect(await this.timeOn(picked)).toHaveCount(0);
  }
}
