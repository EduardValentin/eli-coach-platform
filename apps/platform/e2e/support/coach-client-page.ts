import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { expect, type Locator, type Page } from "@playwright/test";

import { clientPronouns } from "./client-pronouns";
import {
  expectAccessRefused,
  expectAvailability,
  type Availability,
} from "./control-states";
import { isFocused, tabTo } from "./keyboard";
import {
  countOf,
  escapedPattern,
  HYDRATION_RETRY_TIMEOUT_MS,
} from "./locator-text";
import type { PaidClient } from "./paid-clients";

export type Readings = Readonly<Record<string, string>>;

export type ReducedPriceAnswer = "Yes" | "No";

export type ReviewAction = "Review answers" | "Continue review";

export type AnsweredQuestion = {
  form: string;
  question: string;
  answer: string;
};

const FOCUS_TRAP_TAB_STOPS = 60;

const ABSENT_READING = "—";

const PROFILE_TERMS = [
  "Age",
  "Gender",
  "Country",
  "Phone",
  "Height",
  "Starting weight",
  "Current weight",
  "Activity level",
  "Primary goal",
  "Dietary restrictions",
  "Client notes",
] as const;

export class CoachClientPage {
  constructor(private readonly page: Page) {}

  private block(heading: string): Locator {
    return this.page.getByRole("region", { name: heading, exact: true });
  }

  private get onboarding() {
    return this.block("Onboarding");
  }

  private get assessmentCall() {
    return this.page.locator('[data-parity-root="AssessmentCallBlock"]');
  }

  private get assessmentCallTrigger() {
    return this.assessmentCall.getByRole("button", {
      name: "Assessment call",
      exact: true,
    });
  }

  private get reviewDialog() {
    return this.page.getByRole("dialog", { name: /^Review .+’s answers$/ });
  }

  private approvalConfirmation(firstName: string): Locator {
    return this.page.getByRole("dialog", {
      name: `Approve ${firstName}'s answers?`,
    });
  }

  private async confirmApproval(firstName: string): Promise<void> {
    const confirmation = this.approvalConfirmation(firstName);

    await expect(confirmation).toContainText(
      "You won't be able to ask for more details once you approve.",
    );
    await confirmation.getByRole("button", { name: "Approve" }).click();
    await expect(confirmation).toBeHidden();
  }

  private definitionOf(scope: Locator, term: string): Locator {
    return scope
      .getByRole("term")
      .filter({ hasText: new RegExp(`^${escapedPattern(term)}$`) })
      .locator("xpath=following-sibling::dd[1]");
  }

  private async expectReadings(
    scope: Locator,
    readings: Readings,
  ): Promise<void> {
    for (const [term, value] of Object.entries(readings)) {
      await expect(this.definitionOf(scope, term)).toHaveText(value);
    }
  }

  private async expandForm(form: string): Promise<void> {
    await this.expand(
      this.onboarding.getByRole("button", {
        name: new RegExp(`^${escapedPattern(form)}`),
      }),
    );
  }

  private async expand(trigger: Locator): Promise<void> {
    await expect(async () => {
      if ((await trigger.getAttribute("aria-expanded")) !== "true") {
        await trigger.click();
      }

      await expect(trigger).toHaveAttribute("aria-expanded", "true", {
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
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
    await this.page.goto(`/coach/clients/${clientId}`);
  }

  async expectOpen(clientId: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`/coach/clients/${clientId}$`),
    );
  }

  async expectClient(fullName: string, email: string): Promise<void> {
    const heading = this.page.getByRole("heading", {
      level: 1,
      name: fullName,
    });

    await expect(heading).toBeVisible();
    await expect(
      heading
        .locator("xpath=ancestor::header[1]")
        .getByText(email, { exact: true }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("link", { name: "Back to Clients" }),
    ).toHaveAttribute("href", "/coach/clients");
  }

  async expectProfile(readings: Readings): Promise<void> {
    await this.expectReadings(this.block("Profile"), readings);
  }

  async expectProfilePending(gender: VisitorGender): Promise<void> {
    const profile = this.block("Profile");
    const { possessiveCapitalised, possessive, subjectSends } =
      clientPronouns(gender);

    await expect(
      profile.getByText(
        `${possessiveCapitalised} profile fills in once ${subjectSends} ${possessive} onboarding.`,
        { exact: true },
      ),
    ).toBeVisible();
    await this.expectReadings(
      profile,
      Object.fromEntries(PROFILE_TERMS.map((term) => [term, ABSENT_READING])),
    );
  }

  async expectAssessmentCallCollapsed(): Promise<void> {
    await expect(this.assessmentCallTrigger).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(this.assessmentCall.getByRole("term")).toHaveCount(0);
  }

  async expandAssessmentCall(): Promise<void> {
    await this.expand(this.assessmentCallTrigger);
  }

  async expectAssessmentCall(readings: Readings): Promise<void> {
    await this.expectReadings(this.assessmentCall, readings);
  }

  async expectSubscription(readings: Readings): Promise<void> {
    await this.expectReadings(this.block("Subscription"), readings);
  }

  async expectReducedPrice(answer: ReducedPriceAnswer): Promise<void> {
    await expect(
      this.definitionOf(this.block("Subscription"), "Reduced price"),
    ).toHaveText(answer);
  }

  async expectFacts(readings: Readings): Promise<void> {
    await this.expectReadings(this.onboarding, readings);
  }

  async expectInvitationLine(line: string): Promise<void> {
    const invitation = this.block("Invitation");

    await expect(invitation.getByText(line, { exact: true })).toBeVisible();
    await expect(
      invitation.getByRole("button", { name: "Re-send invitation" }),
    ).toBeEnabled();
  }

  async expectNoInvitation(): Promise<void> {
    await expect(this.block("Invitation")).toHaveCount(0);
  }

  async resendInvitation(
    client: Pick<PaidClient, "email" | "gender">,
  ): Promise<void> {
    const confirmation = this.page.getByRole("dialog", {
      name: "Re-send invitation?",
    });

    await this.openDialogWith(
      this.block("Invitation").getByRole("button", {
        name: "Re-send invitation",
      }),
      confirmation,
    );
    await expect(confirmation).toContainText(
      `A fresh invitation goes to ${client.email}. ${clientPronouns(client.gender).possessiveCapitalised} earlier link stops working.`,
    );
    await confirmation.getByRole("button", { name: "Re-send" }).click();
  }

  async expectToast(message: string): Promise<void> {
    await expect(this.page.getByText(message, { exact: true })).toBeVisible();
  }

  async expectStatus(label: string): Promise<void> {
    await expect(
      this.onboarding
        .getByText(label, { exact: true })
        .and(this.page.locator(":not(h1, h2, h3, h4)")),
    ).toBeVisible();
  }

  async expectRefused(): Promise<void> {
    await expectAccessRefused(this.page);
  }

  async expectAnswersNotIn(gender: VisitorGender): Promise<void> {
    const { possessiveCapitalised } = clientPronouns(gender);

    await expect(
      this.onboarding.getByText(
        `${possessiveCapitalised} answers are not in yet.`,
        { exact: true },
      ),
    ).toBeVisible();
  }

  async expectScreeningWarning(warning: string): Promise<void> {
    await expect(
      this.onboarding.getByRole("button", { name: warning }),
    ).toBeVisible();
  }

  async expectReviewActions(action: ReviewAction): Promise<void> {
    await expect(
      this.onboarding.getByRole("button", { name: action }),
    ).toBeVisible();
    await expect(
      this.onboarding.getByRole("button", { name: "Approve answers" }),
    ).toBeVisible();
  }

  async expectNoReviewActions(): Promise<void> {
    for (const action of [
      "Review answers",
      "Continue review",
      "Approve answers",
    ]) {
      await expect(
        this.onboarding.getByRole("button", { name: action }),
      ).toHaveCount(0);
    }
  }

  async expectAnswer(answered: AnsweredQuestion): Promise<void> {
    await this.expandForm(answered.form);
    await expect(
      this.definitionOf(this.onboarding, answered.question),
    ).toContainText(answered.answer);
  }

  async expectNeedsALook(form: string, question: string): Promise<void> {
    await this.expandForm(form);
    await expect(
      this.definitionOf(this.onboarding, question).getByRole("img", {
        name: "Needs a look",
      }),
    ).toBeVisible();
  }

  async openReview(action: ReviewAction): Promise<void> {
    await this.openDialogWith(
      this.onboarding.getByRole("button", { name: action }),
      this.reviewDialog,
    );
    await expect(
      this.reviewDialog.getByRole("button", { name: "Approve answers" }),
    ).toBeVisible();
  }

  async closeReview(): Promise<void> {
    await this.reviewDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(this.reviewDialog).toBeHidden();
  }

  async flag(question: string): Promise<void> {
    await this.reviewDialog
      .getByRole("checkbox", { name: `Flag ${question}`, exact: true })
      .check();
  }

  async writeNote(note: string): Promise<void> {
    await this.reviewDialog
      .getByRole("textbox", { name: "What is missing?" })
      .fill(note);
  }

  async expectFlagCount(count: number): Promise<void> {
    await expect(this.reviewDialog.getByRole("status")).toHaveText(
      `${countOf(count, "question")} flagged`,
    );
  }

  async askForDetails(): Promise<void> {
    await this.reviewDialog
      .getByRole("button", { name: "Ask for more details" })
      .click();
    await expect(this.reviewDialog).toBeHidden();
  }

  async approveAnswers(firstName: string): Promise<void> {
    await this.openDialogWith(
      this.onboarding.getByRole("button", { name: "Approve answers" }),
      this.approvalConfirmation(firstName),
    );
    await this.confirmApproval(firstName);
  }

  async expectWaitingOn(
    answers: number,
    request: { askedOn: string; note: string },
  ): Promise<void> {
    await expect(
      this.onboarding.getByText(
        `Waiting on ${countOf(answers, "answer")} · asked ${request.askedOn}`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      this.onboarding.locator("blockquote", { hasText: request.note }),
    ).toBeVisible();
  }

  async expectNoOpenRequest(): Promise<void> {
    await expect(this.onboarding.getByText(/^Waiting on /)).toHaveCount(0);
  }

  async expectAskedAgain(form: string, question: string): Promise<void> {
    await this.expandForm(form);
    await expect(
      this.onboarding.getByRole("button", {
        name: new RegExp(`^${escapedPattern(form)}.*\\d+ asked again`),
      }),
    ).toBeVisible();
    await expect(
      this.definitionOf(this.onboarding, question).getByText("Asked again", {
        exact: true,
      }),
    ).toBeVisible();
  }

  async expectMeasurements(cells: readonly string[]): Promise<void> {
    const history = this.page.getByRole("table", {
      name: "Measurements history, newest first",
    });

    await expect(history.getByRole("row").nth(1)).toHaveText(
      new RegExp(cells.map(escapedPattern).join(".*")),
    );
  }

  async expectPhoneLink(phone: string): Promise<void> {
    await expect(
      this.block("Profile").getByRole("link", { name: phone }),
    ).toHaveAttribute("href", `tel:${phone}`);
  }

  async expectFormFullyAnswered(form: string): Promise<void> {
    await expect(
      this.onboarding.getByRole("button", {
        name: new RegExp(`^${escapedPattern(form)}.*\\b(\\d+) of \\1 answered`),
      }),
    ).toBeVisible();
  }

  async expectNoForm(form: string): Promise<void> {
    await expect(
      this.onboarding.getByRole("button", {
        name: new RegExp(`^${escapedPattern(form)}`),
      }),
    ).toHaveCount(0);
  }

  async expectQuestionUnreached(form: string, question: string): Promise<void> {
    await this.expandForm(form);
    await expect(this.definitionOf(this.onboarding, question)).toHaveCount(0);
  }

  async expectNoMeasurements(gender: VisitorGender): Promise<void> {
    const { subjectHas } = clientPronouns(gender);

    await expect(
      this.page.getByText(`${subjectHas} not sent any measurements yet.`, {
        exact: true,
      }),
    ).toBeVisible();
  }

  async expectNoBuildProgram(gender: VisitorGender): Promise<void> {
    const buildProgram = `Build ${clientPronouns(gender).possessive} program`;

    await expect(
      this.page
        .getByRole("button", { name: buildProgram })
        .or(this.page.getByRole("link", { name: buildProgram })),
    ).toHaveCount(0);
  }

  async openReviewWithKeyboard(action: ReviewAction): Promise<void> {
    const trigger = this.onboarding.getByRole("button", { name: action });

    await expect(async () => {
      await this.onboarding
        .getByRole("heading", { name: "Onboarding", exact: true })
        .click();
      await tabTo(this.page, trigger);
      await this.page.keyboard.press("Enter");
      await expect(this.reviewDialog).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async expectEveryFormExpanded(): Promise<void> {
    await expect(
      this.reviewDialog.getByRole("button", { expanded: true }).first(),
    ).toBeVisible();
    await expect(
      this.reviewDialog.getByRole("button", { expanded: false }),
    ).toHaveCount(0);
  }

  async expectFocusKeptInReview(): Promise<void> {
    for (let stop = 0; stop < FOCUS_TRAP_TAB_STOPS; stop += 1) {
      await this.page.keyboard.press("Tab");
      expect(
        await this.reviewDialog.evaluate((dialog) =>
          dialog.contains(document.activeElement),
        ),
      ).toBe(true);
    }
  }

  async flagWithKeyboard(question: string): Promise<void> {
    const checkbox = this.reviewDialog.getByRole("checkbox", {
      name: `Flag ${question}`,
      exact: true,
    });

    await tabTo(this.page, checkbox);
    await this.page.keyboard.press("Space");
    await expect(checkbox).toBeChecked();
  }

  async writeNoteWithKeyboard(note: string): Promise<void> {
    await tabTo(
      this.page,
      this.reviewDialog.getByRole("textbox", { name: "What is missing?" }),
    );
    await this.page.keyboard.type(note);
  }

  async expectAskForDetails(availability: Availability): Promise<void> {
    await expectAvailability(
      this.reviewDialog.getByRole("button", { name: "Ask for more details" }),
      availability,
    );
  }

  async closeReviewWithEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.reviewDialog).toBeHidden();
  }

  async expectReviewTriggerFocused(action: ReviewAction): Promise<void> {
    await expect(
      this.onboarding.getByRole("button", { name: action }),
    ).toBeFocused();
  }

  async approveFromReview(firstName: string): Promise<void> {
    await this.reviewDialog
      .getByRole("button", { name: "Approve answers" })
      .click();
    await this.confirmApproval(firstName);
    await expect(this.reviewDialog).toBeHidden();
  }
}
