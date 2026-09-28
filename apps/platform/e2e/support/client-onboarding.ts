import { expect, type Locator, type Page } from "@playwright/test";

type UnitsChoice = "kg · cm" | "lb · in";

type WelcomePartCount = "five" | "four";

const WELCOME_INTRO: Record<WelcomePartCount, RegExp> = {
  five: /Your next step is a short form in five parts/,
  four: /Your next step is a short form in four parts/,
};

const SAVED_LABEL = "Saved";

const RESUME_NOTE = "Picking up where you left off.";

const SCREENING_CLEARED_MESSAGE =
  "Thank you. Nothing here needs a doctor's sign-off — let's keep going.";

const MEASUREMENT_SYSTEM_LEGEND = "How do you measure?";

const MONTH_NAMES: readonly string[] = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, month, 1)),
  ),
);

type MonthYear = { month: number; year: number };

function ordinal(day: number): string {
  if (day % 10 === 1 && day % 100 !== 11) return `${day}st`;
  if (day % 10 === 2 && day % 100 !== 12) return `${day}nd`;
  if (day % 10 === 3 && day % 100 !== 13) return `${day}rd`;

  return `${day}th`;
}

function dayButtonName(date: Date): string {
  const month = MONTH_NAMES[date.getUTCMonth()];

  return `${month} ${ordinal(date.getUTCDate())}, ${date.getUTCFullYear()}`;
}

function monthYearOf(date: Date): MonthYear {
  return { month: date.getUTCMonth(), year: date.getUTCFullYear() };
}

function parseGridMonthYear(ariaLabel: string): MonthYear {
  const match = /([A-Za-z]+)\s+(\d{4})$/.exec(ariaLabel);

  if (!match) {
    throw new Error(`Cannot read a month and year from "${ariaLabel}".`);
  }

  const [, monthName, year] = match;

  return { month: MONTH_NAMES.indexOf(monthName), year: Number(year) };
}

function monthsBetween(from: MonthYear, to: MonthYear): number {
  return (to.year - from.year) * 12 + (to.month - from.month);
}

export class ClientOnboarding {
  constructor(private readonly page: Page) {}

  private get measurementSystem() {
    return this.page.getByRole("radiogroup", {
      name: MEASUREMENT_SYSTEM_LEGEND,
    });
  }

  private async click(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    await locator.click();
  }

  private async check(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    await locator.check();
  }

  async expectWelcomeHeading(firstName: string): Promise<void> {
    await expect(
      this.page.getByRole("heading", {
        level: 1,
        name: `Welcome to Evoa Fitness, ${firstName}`,
      }),
    ).toBeVisible();
  }

  async expectWelcomeIntro(parts: WelcomePartCount): Promise<void> {
    await expect(this.page.getByText(WELCOME_INTRO[parts])).toBeVisible();
  }

  async startOnboarding(): Promise<void> {
    await this.click(
      this.page.getByRole("button", { name: "Let's get started" }),
    );
  }

  async expectStep(step: number, total: number): Promise<void> {
    await expect(
      this.page.getByText(`Step ${step} of ${total}`, { exact: true }),
    ).toBeVisible();
  }

  async chooseUnits(option: UnitsChoice): Promise<void> {
    await this.check(
      this.measurementSystem.getByRole("radio", { name: option, exact: true }),
    );
  }

  async answerText(label: string, value: string): Promise<void> {
    await this.page.getByLabel(label).fill(value);
  }

  async choose(label: string, option: string): Promise<void> {
    const combobox = this.page.getByRole("combobox", { name: label });
    const radiogroup = this.page.getByRole("radiogroup", { name: label });
    await combobox.or(radiogroup).first().waitFor();

    if (await combobox.count()) {
      await this.click(combobox);
      await this.click(
        this.page.getByRole("option", { name: option, exact: true }),
      );

      return;
    }

    await this.check(
      radiogroup.getByRole("radio", { name: option, exact: true }),
    );
  }

  async tick(label: string): Promise<void> {
    await this.check(
      this.page.getByRole("checkbox", { name: label, exact: true }),
    );
  }

  async pickDate(label: string, isoDate: string): Promise<void> {
    await this.click(this.page.getByRole("button", { name: label }));
    const dialog = this.page.getByRole("dialog");
    const grid = dialog.getByRole("grid");
    await expect(grid).toBeVisible();

    const target = new Date(`${isoDate}T12:00:00Z`);
    const displayed = parseGridMonthYear(
      (await grid.getAttribute("aria-label")) ?? "",
    );
    const steps = monthsBetween(displayed, monthYearOf(target));
    const navButtonName = steps >= 0 ? "Next month" : "Previous month";

    for (let step = 0; step < Math.abs(steps); step += 1) {
      await this.click(dialog.getByRole("button", { name: navButtonName }));
    }

    await this.click(
      dialog.getByRole("button", { name: dayButtonName(target) }),
    );
    await expect(dialog).toBeHidden();
  }

  async continueStep(): Promise<void> {
    await this.click(this.page.getByRole("button", { name: "Continue" }));
  }

  async expectSaved(): Promise<void> {
    await expect(
      this.page.getByText(SAVED_LABEL, { exact: true }),
    ).toBeVisible();
  }

  async expectResumeNote(): Promise<void> {
    await expect(
      this.page.getByText(RESUME_NOTE, { exact: true }),
    ).toBeVisible();
  }

  async expectScreeningCleared(): Promise<void> {
    await expect(this.page.getByText(SCREENING_CLEARED_MESSAGE)).toBeVisible();
  }

  async sendToCoach(): Promise<void> {
    await this.click(
      this.page.getByRole("button", { name: "Send to my coach" }),
    );
  }
}
