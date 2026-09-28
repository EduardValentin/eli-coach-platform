import { expect, type Locator, type Page } from "@playwright/test";

export type Readings = Readonly<Record<string, string>>;

export type ReviewAction = "Review answers" | "Continue review";

export type AnsweredQuestion = {
  form: string;
  question: string;
  answer: string;
};

const HYDRATION_RETRY_TIMEOUT_MS = 1_000;

function answerCountPattern(answers: number): string {
  return `${answers} ${answers === 1 ? "answer" : "answers"}`;
}

export class CoachClientPage {
  constructor(private readonly page: Page) {}

  private block(heading: string): Locator {
    return this.page.getByRole("region", { name: heading, exact: true });
  }

  private get onboarding() {
    return this.block("Onboarding");
  }

  private get reviewDialog() {
    return this.page.getByRole("dialog", { name: /^Review .+’s answers$/ });
  }

  private definitionOf(scope: Locator, term: string): Locator {
    return scope
      .getByRole("term")
      .filter({ hasText: new RegExp(`^${term}$`) })
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
    const trigger = this.onboarding.getByRole("button", {
      name: new RegExp(`^${form}`),
    });

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
    await expect(
      this.page.getByRole("heading", { level: 1, name: fullName }),
    ).toBeVisible();
    await expect(this.page.getByText(email, { exact: true })).toBeVisible();
    await expect(
      this.page.getByRole("link", { name: "Back to Clients" }),
    ).toHaveAttribute("href", "/coach/clients");
  }

  async expectProfile(readings: Readings): Promise<void> {
    await this.expectReadings(this.block("Profile"), readings);
  }

  async expectSubscription(readings: Readings): Promise<void> {
    await this.expectReadings(this.block("Subscription"), readings);
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

  async resendInvitation(email: string): Promise<void> {
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
      `A fresh invitation goes to ${email}. Her earlier link stops working.`,
    );
    await confirmation.getByRole("button", { name: "Re-send" }).click();
  }

  async expectToast(message: string): Promise<void> {
    await expect(this.page.getByText(message, { exact: true })).toBeVisible();
  }

  async expectStatus(label: string): Promise<void> {
    await expect(
      this.onboarding.getByText(label, { exact: true }),
    ).toBeVisible();
  }

  async expectAnswersNotIn(): Promise<void> {
    await expect(
      this.onboarding.getByText("Her answers are not in yet.", {
        exact: true,
      }),
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
      `${count} ${count === 1 ? "question" : "questions"} flagged`,
    );
  }

  async askForDetails(): Promise<void> {
    await this.reviewDialog
      .getByRole("button", { name: "Ask for more details" })
      .click();
    await expect(this.reviewDialog).toBeHidden();
  }

  async approveAnswers(firstName: string): Promise<void> {
    const confirmation = this.page.getByRole("dialog", {
      name: `Approve ${firstName}'s answers?`,
    });

    await this.openDialogWith(
      this.onboarding.getByRole("button", { name: "Approve answers" }),
      confirmation,
    );
    await expect(confirmation).toContainText(
      "You won't be able to ask for more details once you approve.",
    );
    await confirmation.getByRole("button", { name: "Approve" }).click();
    await expect(confirmation).toBeHidden();
  }

  async expectWaitingOn(
    answers: number,
    request: { askedOn: string; note: string },
  ): Promise<void> {
    await expect(
      this.onboarding.getByText(
        `Waiting on ${answerCountPattern(answers)} · asked ${request.askedOn}`,
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
        name: new RegExp(`^${form}.*\\d+ asked again`),
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
      new RegExp(cells.join(".*")),
    );
  }
}
