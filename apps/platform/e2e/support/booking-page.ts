import { expect, type Page } from "@playwright/test";

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

export class BookingPage {
  constructor(private readonly page: Page) {}

  async openDetails(): Promise<void> {
    await this.page.goto("/book");
    await this.pickSoonestOpenSlot();
    await this.page
      .getByRole("button", { name: "Continue to your details" })
      .click();
  }

  async expectGenderOptions(options: readonly string[]): Promise<void> {
    await this.page
      .getByRole("combobox", { name: "Gender", exact: true })
      .click();
    await expect(this.page.getByRole("option")).toHaveText([...options]);
    await this.page.keyboard.press("Escape");
  }

  async bookSoonestCall(visitor: BookingVisitor): Promise<void> {
    await this.openDetails();
    await this.fillDetails(visitor);
    await this.page.getByRole("button", { name: "Schedule Call" }).click();
  }

  private async pickSoonestOpenSlot(): Promise<void> {
    await this.page
      .getByRole("grid", { name: "Available days" })
      .getByRole("button", { disabled: false })
      .first()
      .click();
    await this.page
      .getByRole("main")
      .getByRole("button", { name: CLOCK_TIME })
      .first()
      .click();
  }

  private async fillDetails(visitor: BookingVisitor): Promise<void> {
    await this.page.getByLabel("First name").fill(visitor.firstName);
    await this.page.getByLabel("Last name").fill(visitor.lastName);
    await this.page.getByLabel("Email Address").fill(visitor.email);
    await this.pickBirthDate();
    await this.chooseOption("Gender", BOOKING_PROFILE.gender);
    await this.page.getByRole("combobox", { name: "Primary goal" }).click();
    await this.page
      .getByRole("option", { name: BOOKING_PROFILE.primaryGoal })
      .click();
    await this.chooseOption("Country", BOOKING_PROFILE.country);
    await this.page
      .getByLabel("Phone number")
      .fill(BOOKING_PROFILE.phoneNumber);

    if (visitor.notes) {
      await this.page
        .getByLabel("Anything to share beforehand? (Optional)")
        .fill(visitor.notes);
    }
  }

  private async pickBirthDate(): Promise<void> {
    await this.page.getByRole("button", { name: "Date of birth" }).click();
    await this.chooseOption("Year", BOOKING_PROFILE.birthYear);
    await this.chooseOption("Month", BOOKING_PROFILE.birthMonth);
    await this.page
      .getByRole("grid", { name: /Birth date/ })
      .getByRole("button", { name: BOOKING_PROFILE.birthDay })
      .click();
  }

  private async chooseOption(field: string, option: string): Promise<void> {
    await this.page.getByRole("combobox", { name: field, exact: true }).click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
  }
}
