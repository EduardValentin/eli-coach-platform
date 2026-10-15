import { expect, type Locator, type Page } from "@playwright/test";

import { clockTimeOf, dayNameOf, spacedPattern } from "./check-in-moments";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type BookingVisitor = {
  email: string;
  firstName: string;
  lastName: string;
  notes?: string;
};

export const BOOKING_PROFILE = {
  birthDateOnCoachCard: /\(14 Mar 1994\)/,
  birthDay: /March 14th, 1994/,
  birthMonth: "March",
  birthYear: "1994",
  country: "Romania",
  gender: "Female",
  phoneNumber: "0712 345 678",
  phoneNumberE164: "+40712345678",
  primaryGoal: "Build strength",
} as const;

const CLOCK_TIME = /^\d{1,2}:\d{2}/;
const NEXT_MONTH = /next month/i;
const MONTHS_AHEAD = 2;

export class BookingPage {
  constructor(private readonly page: Page) {}

  async openDetails(): Promise<void> {
    await this.page.goto("/book");
    await this.pickSoonestOpenSlot();
    await this.page
      .getByRole("button", { name: "Continue to your details" })
      .click();
  }

  private get days(): Locator {
    return this.page.getByRole("grid", { name: "Available days" });
  }

  private get times(): Locator {
    return this.page
      .getByRole("main")
      .getByRole("button", { name: CLOCK_TIME });
  }

  private timeOf(instant: Date, timeZone: string): Locator {
    return this.page.getByRole("main").getByRole("button", {
      name: new RegExp(`^${spacedPattern(clockTimeOf(instant, timeZone))}$`),
    });
  }

  private async showDayOf(instant: Date, timeZone: string): Promise<void> {
    const day = this.days.getByRole("button", {
      name: new RegExp(`^${spacedPattern(dayNameOf(instant, timeZone))}`),
    });

    await this.page.goto("/book");
    await expect(this.days.getByRole("button").first()).toBeVisible();
    for (
      let shown = 0;
      shown < MONTHS_AHEAD &&
      ((await day.count()) === 0 || (await day.isDisabled()));
      shown += 1
    ) {
      await this.page.getByRole("button", { name: NEXT_MONTH }).click();
    }
    await this.chooseDay(day);
  }

  private async chooseDay(day: Locator): Promise<void> {
    await expect(async () => {
      if ((await this.times.count()) === 0) {
        await day.click();
      }
      await expect(this.times.first()).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async expectHourNotOffered(instant: Date, timeZone: string): Promise<void> {
    await this.showDayOf(instant, timeZone);
    await expect(this.timeOf(instant, timeZone)).toHaveCount(0);
  }

  async expectHourOffered(instant: Date, timeZone: string): Promise<void> {
    await this.showDayOf(instant, timeZone);
    await expect(this.timeOf(instant, timeZone)).toBeVisible();
  }

  async expectGenderOptions(options: readonly string[]): Promise<void> {
    await this.combobox("Gender (required)").click();
    await expect(this.page.getByRole("option")).toHaveText([...options]);
    await this.page.keyboard.press("Escape");
  }

  async bookSoonestCall(visitor: BookingVisitor): Promise<void> {
    await this.openDetails();
    await this.fillDetails(visitor);
    await this.page.getByRole("button", { name: "Schedule Call" }).click();
  }

  private async pickSoonestOpenSlot(): Promise<void> {
    await this.chooseDay(
      this.days.getByRole("button", { disabled: false }).first(),
    );
    await this.times.first().click();
  }

  private async fillDetails(visitor: BookingVisitor): Promise<void> {
    await this.textbox("First name (required)").fill(visitor.firstName);
    await this.textbox("Last name (required)").fill(visitor.lastName);
    await this.textbox("Email Address (required)").fill(visitor.email);
    await this.pickBirthDate();
    await this.chooseOption("Gender (required)", BOOKING_PROFILE.gender);
    await this.chooseOption(
      "Primary goal (required)",
      BOOKING_PROFILE.primaryGoal,
    );
    await this.chooseOption("Country (required)", BOOKING_PROFILE.country);
    await this.page
      .getByLabel("Phone number")
      .fill(BOOKING_PROFILE.phoneNumber);

    if (visitor.notes) {
      await this.textbox("Anything to share beforehand?").fill(visitor.notes);
    }
  }

  private async pickBirthDate(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Date of birth (required)", exact: true })
      .click();
    await this.chooseOption("Year", BOOKING_PROFILE.birthYear);
    await this.chooseOption("Month", BOOKING_PROFILE.birthMonth);
    await this.page
      .getByRole("grid", { name: /Birth date/ })
      .getByRole("button", { name: BOOKING_PROFILE.birthDay })
      .click();
  }

  private textbox(name: string): Locator {
    return this.page.getByRole("textbox", { name, exact: true });
  }

  private combobox(name: string): Locator {
    return this.page.getByRole("combobox", { name, exact: true });
  }

  private async chooseOption(field: string, option: string): Promise<void> {
    await this.combobox(field).click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
  }
}
