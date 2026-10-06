import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoView,
} from "@eli-coach-platform/domain/client-profile";
import {
  expect,
  type Locator,
  type Page,
  type Request,
} from "@playwright/test";

import { expectAvailability, type Availability } from "./control-states";
import { tabTo } from "./keyboard";
import { ProgressPhotoTiles } from "./progress-photo-tiles";
import type { SamplePhoto } from "./sample-photos";

type UnitsChoice = "kg · cm" | "lb · in";

type WelcomePartCount = "five" | "four";

const WELCOME_INTRO: Record<WelcomePartCount, RegExp> = {
  five: /Your next step is a short form in five parts/,
  four: /Your next step is a short form in four parts/,
};

const SAVED_LABEL = "Saved";

const UNSAVED_LABEL = "Not saved yet. We'll try again when you're back online.";

const MISSING_CONSENT = "Tick the box to carry on.";

const SUBMIT_PROBLEM =
  "Your answers could not be sent just now. They're saved — try again in a moment.";

const MANUAL_SCREENING_MESSAGE =
  "These safety questions are designed for ages 15 to 69. I'll go through your health questions with you directly before building your program.";

const PRIVACY_LINK_LABEL = "How I handle your data →";

const PRIVACY_PATH = "/privacy";

const PAGE_HEADING = "Let's get you set up";

const SEND_TO_COACH = "Send to my coach";

const DRAFT_API = "**/api/client-onboarding/draft";

const SUBMISSION_API = "**/api/client-onboarding/submission.data";

const UNIT_PREFERENCE_API = "**/api/client-profile/unit-preference";

const DETAIL_ANSWERS_API = "**/api/client-onboarding/detail-answers.data";

const ANSWER_SEND_PROBLEM =
  "Your answers could not be sent just now. Try again in a moment.";

const RESUME_NOTE = "Picking up where you left off.";

const SCREENING_CLEARED_MESSAGE =
  "Thank you. Nothing here needs a doctor's sign-off — let's keep going.";

const MEASUREMENT_SYSTEM_LEGEND = "How do you measure?";

const ANSWER_PAGE_HEADING = "A few more details";

const ANSWER_REQUEST_HEADING = "What your coach asked";

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

  private get answerRequest() {
    return this.page.getByRole("region", { name: ANSWER_REQUEST_HEADING });
  }

  private get photoTiles() {
    return new ProgressPhotoTiles(this.page.locator("body"));
  }

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

  private entry(label: string): Locator {
    return this.page
      .getByLabel(label)
      .and(this.page.locator("input, textarea"));
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

  async clickChoice(label: string, option: string): Promise<void> {
    await this.click(
      this.page
        .getByRole("radiogroup", { name: label })
        .getByRole("radio", { name: option, exact: true }),
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

  async expectOnePageHeading(): Promise<void> {
    await expect(this.page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      this.page.getByRole("heading", { level: 1, name: PAGE_HEADING }),
    ).toBeVisible();
  }

  async expectStepHeadingDescribed(
    title: string,
    step: number,
    total: number,
  ): Promise<void> {
    await expect(
      this.page.getByRole("heading", { level: 2, name: title }),
    ).toHaveAccessibleDescription(`Step ${step} of ${total}`);
  }

  async expectStepHeadingFocused(title: string): Promise<void> {
    await expect(
      this.page.getByRole("heading", { level: 2, name: title }),
    ).toBeFocused();
  }

  async expectEntryProblem(label: string, message: string): Promise<void> {
    const entry = this.entry(label);
    await expect(entry).toHaveAttribute("aria-invalid", "true");
    await expect(entry).toHaveAccessibleDescription(new RegExp(message));
  }

  async expectEntryFocused(label: string): Promise<void> {
    await expect(this.entry(label)).toBeFocused();
  }

  async expectChoiceProblem(label: string, message: string): Promise<void> {
    await expect(
      this.page.getByRole("group", { name: label }),
    ).toHaveAccessibleDescription(new RegExp(message));
  }

  async expectEntryHint(label: string, hint: string): Promise<void> {
    await expect(this.entry(label)).toHaveAccessibleDescription(hint);
  }

  async expectOptional(label: string): Promise<void> {
    await expect(this.entry(label)).toHaveAccessibleName(/\(optional\)/);
  }

  async expectAnswer(label: string, value: string): Promise<void> {
    await expect(this.entry(label)).toHaveValue(value);
  }

  async expectUnits(option: UnitsChoice): Promise<void> {
    await expect(
      this.measurementSystem.getByRole("radio", { name: option, exact: true }),
    ).toBeChecked();
  }

  async expectTicked(label: string): Promise<void> {
    await expect(
      this.page.getByRole("checkbox", { name: label, exact: true }),
    ).toBeChecked();
  }

  async expectNotTicked(label: string): Promise<void> {
    await expect(
      this.page.getByRole("checkbox", { name: label, exact: true }),
    ).not.toBeChecked();
  }

  async expectChosen(label: string, option: string): Promise<void> {
    await expect(
      this.page
        .getByRole("radiogroup", { name: label })
        .getByRole("radio", { name: option, exact: true }),
    ).toBeChecked();
  }

  async expectQuestionHidden(label: string): Promise<void> {
    await expect(this.page.getByLabel(label)).toHaveCount(0);
  }

  async expectConsentStatement(statement: string): Promise<void> {
    await expect(
      this.page.getByRole("checkbox", { name: statement, exact: true }),
    ).toBeVisible();
  }

  async expectPrivacyLink(): Promise<void> {
    await expect(
      this.page.getByRole("link", { name: PRIVACY_LINK_LABEL }),
    ).toHaveAttribute("href", PRIVACY_PATH);
  }

  async expectConsentProblem(): Promise<void> {
    await expect(
      this.page.getByRole("alert").filter({ hasText: MISSING_CONSENT }),
    ).toBeVisible();
  }

  async expectManualScreening(): Promise<void> {
    await expect(this.page.getByText(MANUAL_SCREENING_MESSAGE)).toBeVisible();
    await expect(this.page.getByRole("radiogroup")).toHaveCount(0);
  }

  async expectUnsaved(): Promise<void> {
    await expect(
      this.page.getByText(UNSAVED_LABEL, { exact: true }),
    ).toBeVisible();
  }

  async expectSubmitProblem(): Promise<void> {
    await expect(this.page.getByText(SUBMIT_PROBLEM)).toBeVisible();
  }

  async expectSendToCoach(availability: Availability): Promise<void> {
    await expectAvailability(
      this.page.getByRole("button", { name: SEND_TO_COACH }),
      availability,
    );
  }

  async blockDraftSaves(): Promise<void> {
    await this.page.route(DRAFT_API, (route) => route.abort());
  }

  async blockSubmissions(): Promise<void> {
    await this.page.route(SUBMISSION_API, (route) => route.abort());
  }

  async blockUnitPreference(): Promise<void> {
    await this.page.route(UNIT_PREFERENCE_API, (route) => route.abort(), {
      times: 1,
    });
  }

  async blockDetailAnswers(): Promise<void> {
    await this.page.route(DETAIL_ANSWERS_API, (route) => route.abort());
  }

  async restoreDetailAnswers(): Promise<void> {
    await this.page.unroute(DETAIL_ANSWERS_API);
  }

  async expectAnswerSendProblem(): Promise<void> {
    await expect(
      this.page.getByText(ANSWER_SEND_PROBLEM, { exact: true }),
    ).toBeVisible();
  }

  async keepUnitPreferenceOffline(): Promise<void> {
    await this.page.route(UNIT_PREFERENCE_API, (route) => route.abort());
  }

  async restoreConnection(): Promise<void> {
    await this.page.unroute(DRAFT_API);
    await this.page.unroute(SUBMISSION_API);
    await this.page.unroute(UNIT_PREFERENCE_API);
    await this.page.evaluate(() => window.dispatchEvent(new Event("online")));
  }

  async keyboardTick(label: string): Promise<void> {
    const checkbox = this.page.getByRole("checkbox", {
      name: label,
      exact: true,
    });
    await tabTo(this.page, checkbox);
    await this.page.keyboard.press("Space");
    await expect(checkbox).toBeChecked();
  }

  async keyboardChoose(label: string, option: string): Promise<void> {
    const radiogroup = this.page.getByRole("radiogroup", { name: label });
    const radios = radiogroup.getByRole("radio");
    const target = radiogroup.getByRole("radio", { name: option, exact: true });
    await tabTo(this.page, radiogroup);
    const names = await radios.allInnerTexts();
    const targetIndex = names.indexOf(option);

    for (let index = 0; index < targetIndex; index += 1) {
      await expect(radios.nth(index)).toBeFocused();
      await this.page.keyboard.press("ArrowRight");
    }

    await expect(target).toBeFocused();
    await this.page.keyboard.press("Space");
    await expect(target).toBeChecked();
  }

  async keyboardContinue(): Promise<void> {
    await tabTo(this.page, this.page.getByRole("button", { name: "Continue" }));
    await this.page.keyboard.press("Enter");
  }

  async expectPhotosLocked(): Promise<void> {
    await this.photoTiles.expectLocked();
  }

  async agreeToPhotos(): Promise<void> {
    await this.photoTiles.agree();
  }

  async withdrawFromPhotos(): Promise<void> {
    await this.photoTiles.withdraw();
  }

  async expectPhotosUnlocked(): Promise<void> {
    await this.photoTiles.expectUnlocked();
  }

  async addPhoto(view: ProgressPhotoView, photo: SamplePhoto): Promise<void> {
    await this.photoTiles.add(view, photo);
  }

  async expectNoPhotoPreview(view: ProgressPhotoView): Promise<void> {
    await this.photoTiles.expectNoPreview(view);
  }

  async expectPhotoRefusal(): Promise<void> {
    await this.photoTiles.expectRefusal();
  }

  async expectNoPhotoRefusal(): Promise<void> {
    await this.photoTiles.expectNoRefusal();
  }

  async expectPhotoPreview(view: ProgressPhotoView): Promise<void> {
    await this.photoTiles.expectPreview(view);
  }

  async sendToCoach(): Promise<void> {
    await this.click(
      this.page.getByRole("button", { name: "Send to my coach" }),
    );
  }

  async sendToCoachCapturingSentPhotoViews(): Promise<ProgressPhotoView[]> {
    const submission = this.page.waitForRequest(SUBMISSION_API);
    await this.sendToCoach();

    return photoViewsSentIn(await submission);
  }

  async expectAnswerPage(note: string): Promise<void> {
    await expect(this.page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      this.page.getByRole("heading", { level: 1, name: ANSWER_PAGE_HEADING }),
    ).toBeVisible();
    await expect(
      this.answerRequest.getByText(note, { exact: true }),
    ).toBeVisible();
  }

  async expectOnlyQuestions(labels: readonly string[]): Promise<void> {
    const controls = this.answerRequest
      .getByRole("textbox")
      .or(this.answerRequest.getByRole("combobox"))
      .or(this.answerRequest.getByRole("radiogroup"))
      .or(this.answerRequest.getByRole("checkbox"))
      .or(this.answerRequest.getByRole("spinbutton"));

    await expect(controls).toHaveCount(labels.length);

    for (const label of labels) {
      await expect(this.answerRequest.getByLabel(label)).toBeVisible();
    }
  }

  async expectSelected(label: string, option: string): Promise<void> {
    await expect(this.page.getByRole("combobox", { name: label })).toHaveText(
      option,
    );
  }

  async notNow(): Promise<void> {
    await this.click(this.page.getByRole("link", { name: "Not now" }));
  }

  async sendMyAnswers(): Promise<void> {
    await this.click(
      this.page.getByRole("button", { name: "Send my answers" }),
    );
  }
}

function photoViewsSentIn(submission: Request): ProgressPhotoView[] {
  const body = submission.postDataBuffer()?.toString("latin1") ?? "";

  return PROGRESS_PHOTO_VIEWS.filter((view) => body.includes(`name="${view}"`));
}
