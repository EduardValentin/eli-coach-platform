import type { VisitorGender } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import { expect, type Locator, type Page } from "@playwright/test";

import { initialsOf } from "./avatar-initials";
import { clientPronouns } from "./client-pronouns";
import type { ConfirmationLabels } from "./confirmation-dialog";
import { DisabledAction } from "./disabled-action";
import {
  expectAccessRefused,
  expectAvailability,
  type Availability,
} from "./control-states";
import { isFocused, tabTo } from "./keyboard";
import { expectImageLoaded } from "./loaded-images";
import {
  countOf,
  escapedPattern,
  HYDRATION_RETRY_TIMEOUT_MS,
} from "./locator-text";
import { MeasurementsHistory } from "./measurements-history";
import type { PaidClient } from "./paid-clients";
import { WEEKLY_DIALOG_TITLE } from "./weekly-check-in-dialog";

export type Readings = Readonly<Record<string, string>>;

export type ReducedPriceAnswer = "Yes" | "No";

export type ReviewAction = "Review answers" | "Continue review";

export type AnsweredQuestion = {
  form: string;
  question: string;
  answer: string;
};

const FOCUS_TRAP_TAB_STOPS = 60;

const SCHEDULE_DIALOG_TITLE = /^Schedule a check-in with \S+$/;

const NO_WEEKLY_CHECK_IN = "No weekly check-in yet.";

const SET_UP_WEEKLY = "Set up a weekly check-in";

const WEEKLY_MENU_TRIGGER = "More actions for the weekly check-in";

const VIEW_ALL_CHECK_INS = "View all check-ins";

const CHECK_INS_PATH = "/coach/checkins";

const ARROW_SETTLE_MS = 250;

const DISABLED_ACTION_HINT = '[data-parity="disabled-action-hint"]';

export const STOP_WEEKLY_CHECK_IN_LABELS: ConfirmationLabels = {
  title: "Stop the weekly check-in?",
  confirm: "Stop",
  dismiss: "Keep",
};

type WeeklyAction = "Change" | "Stop";

const NEEDS_REFUND_LABEL = "Needs refund";

const CANCELLED_OR_ENDED_ACTIONS = [
  "Review answers",
  "Continue review",
  "Approve answers",
  "Ask for more details",
  "Re-send invitation",
] as const;

const PROFILE_TERMS = ["Age", "Gender", "Country", "Phone", "Email"] as const;

const VIEW_PROFILE = "View profile";

export class CoachClientPage {
  private readonly measurementsHistory: MeasurementsHistory;

  constructor(private readonly page: Page) {
    this.measurementsHistory = new MeasurementsHistory(page);
  }

  private block(heading: string): Locator {
    return this.page.getByRole("region", { name: heading, exact: true });
  }

  private get onboarding() {
    return this.block("Onboarding");
  }

  private get onboardingTrigger() {
    return this.onboarding.getByRole("button", {
      name: "Onboarding",
      exact: true,
    });
  }

  private get viewProfileLink() {
    return this.block("Profile").getByRole("link", {
      name: VIEW_PROFILE,
      exact: true,
    });
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

  private get scheduleButton() {
    return this.page.getByRole("button", {
      name: "Schedule check-in",
      exact: true,
    });
  }

  private get scheduleDialog() {
    return this.page.getByRole("dialog", { name: SCHEDULE_DIALOG_TITLE });
  }

  private get resourcesLink() {
    return this.page.getByRole("link", { name: "Resources", exact: true });
  }

  private get weeklyPanel() {
    return this.block("Weekly check-in");
  }

  private get weeklyDialog() {
    return this.page.getByRole("dialog", { name: WEEKLY_DIALOG_TITLE });
  }

  private get setUpWeeklyButton() {
    return this.weeklyPanel.getByRole("button", {
      name: SET_UP_WEEKLY,
      exact: true,
    });
  }

  private get weeklyMenuTrigger() {
    return this.weeklyPanel.getByRole("button", {
      name: WEEKLY_MENU_TRIGGER,
      exact: true,
    });
  }

  private get weeklyMenu() {
    return this.page.getByRole("menu");
  }

  private weeklyMenuItem(action: WeeklyAction): Locator {
    return this.weeklyMenu.getByRole("menuitem", { name: action, exact: true });
  }

  private get viewAllCheckInsLink() {
    return this.weeklyPanel.getByRole("link", {
      name: VIEW_ALL_CHECK_INS,
      exact: true,
    });
  }

  private async openWeeklyMenuByKeyboard(): Promise<void> {
    await expect(async () => {
      if (!(await this.weeklyMenu.isVisible())) {
        await tabTo(this.page, this.weeklyMenuTrigger);
        await this.page.keyboard.press("Enter");
      }
      await expect(this.weeklyMenu).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  private async focusWeeklyMenuItemByKeyboard(
    action: WeeklyAction,
  ): Promise<void> {
    await this.openWeeklyMenuByKeyboard();
    const item = this.weeklyMenuItem(action);

    await expect(async () => {
      if (!(await isFocused(item))) {
        await this.page.keyboard.press("ArrowDown");
      }
      expect(await isFocused(item)).toBe(true);
    }).toPass({ intervals: [ARROW_SETTLE_MS] });
  }

  private awaitingOnboardingReason(gender: VisitorGender): string {
    const { possessive, subject, subjectHas } = clientPronouns(gender);

    return `${subject} can answer a check-in once ${subjectHas.toLowerCase()} sent ${possessive} onboarding.`;
  }

  private scheduleActionFor(gender: VisitorGender): DisabledAction {
    return new DisabledAction(this.page, {
      button: this.scheduleButton,
      opens: this.scheduleDialog,
      reason: this.awaitingOnboardingReason(gender),
    });
  }

  private setUpActionFor(gender: VisitorGender): DisabledAction {
    return new DisabledAction(this.page, {
      button: this.setUpWeeklyButton,
      opens: this.weeklyDialog,
      reason: this.awaitingOnboardingReason(gender),
      focusByKeyboard: () => this.tabToSetUpOnceHintsSettle(),
    });
  }

  private async tabToSetUpOnceHintsSettle(): Promise<void> {
    const setUp = this.setUpWeeklyButton;

    if (await isFocused(setUp)) {
      await this.page.keyboard.press("Shift+Tab");
    }
    await tabTo(this.page, setUp);
    await expect(this.page.locator(DISABLED_ACTION_HINT)).toHaveCount(1);
  }

  private headerOf(fullName: string): Locator {
    return this.page
      .getByRole("heading", { level: 1, name: fullName })
      .locator("xpath=ancestor::header[1]");
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

  private headerPictureOf(fullName: string): Locator {
    return this.headerOf(fullName).locator('img[data-slot="avatar-image"]');
  }

  private headerInitialsOf(fullName: string): Locator {
    return this.headerOf(fullName).locator('[data-slot="avatar-fallback"]');
  }

  private async expandOnboardingIfCollapsed(): Promise<void> {
    if ((await this.onboardingTrigger.count()) > 0) {
      await this.expand(this.onboardingTrigger);
    }
  }

  private async expandForm(form: string): Promise<void> {
    await this.expandOnboardingIfCollapsed();
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

  async openResources(): Promise<void> {
    await this.resourcesLink.click();
  }

  async openScheduleDialog(): Promise<void> {
    await this.openDialogWith(this.scheduleButton, this.scheduleDialog);
  }

  async openScheduleDialogWithKeyboard(): Promise<void> {
    await expect(async () => {
      await tabTo(this.page, this.scheduleButton);
      await this.page.keyboard.press("Enter");
      await expect(this.scheduleDialog).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async expectScheduleButtonFocused(): Promise<void> {
    await expect(this.scheduleButton).toBeFocused();
  }

  async expectScheduleBlocked(gender: VisitorGender): Promise<void> {
    await this.scheduleActionFor(gender).expectBlocked();
  }

  async expectScheduleReasonOnHover(gender: VisitorGender): Promise<void> {
    await this.scheduleActionFor(gender).expectReasonOnHover();
  }

  async expectScheduleReasonOnFocus(gender: VisitorGender): Promise<void> {
    await this.scheduleActionFor(gender).expectReasonOnFocus();
  }

  async expectScheduleReasonOnTap(gender: VisitorGender): Promise<void> {
    await this.scheduleActionFor(gender).expectReasonOnTap();
  }

  async expectNoScheduleAction(): Promise<void> {
    await expect(this.resourcesLink).toBeVisible();
    await expect(this.scheduleButton).toHaveCount(0);
  }

  async expectHeaderActionsInView(): Promise<void> {
    await expect(this.resourcesLink).toBeInViewport({ ratio: 1 });
    await expect(this.scheduleButton).toBeInViewport({ ratio: 1 });
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

  async expectProfile(clientId: string, readings: Readings): Promise<void> {
    const profile = this.block("Profile");

    await expect(profile.getByRole("term")).toHaveText([...PROFILE_TERMS]);
    await this.expectReadings(profile, readings);
    await expect(this.viewProfileLink).toHaveAttribute(
      "href",
      `/coach/clients/${clientId}/profile`,
    );
  }

  async openProfile(): Promise<void> {
    await this.viewProfileLink.click();
    await expect(this.page).toHaveURL(/\/coach\/clients\/[^/]+\/profile$/);
  }

  async expectHeaderPicture(fullName: string): Promise<void> {
    const picture = this.headerPictureOf(fullName);

    await expectImageLoaded(picture);
  }

  async expectHeaderInitials(fullName: string): Promise<void> {
    await expect(this.headerInitialsOf(fullName)).toHaveText(
      initialsOf(fullName),
    );
    await expect(this.headerPictureOf(fullName)).toHaveCount(0);
  }

  async expectOnboardingCollapsed(): Promise<void> {
    await expect(this.onboardingTrigger).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(
      this.onboarding.getByRole("heading", {
        level: 3,
        name: "Answers",
        exact: true,
      }),
    ).toHaveCount(0);
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

  async expectNeedsRefundBadge(fullName: string): Promise<void> {
    await expect(
      this.headerOf(fullName).getByText(NEEDS_REFUND_LABEL, { exact: true }),
    ).toBeVisible();
  }

  async expectNoNeedsRefundBadge(fullName: string): Promise<void> {
    await expect(this.headerOf(fullName)).toBeVisible();
    await expect(
      this.headerOf(fullName).getByText(NEEDS_REFUND_LABEL, { exact: true }),
    ).toHaveCount(0);
  }

  async expectRefundDue(amountDue: string, reason: string): Promise<void> {
    const refundDue = this.definitionOf(
      this.block("Subscription"),
      "Refund due",
    );

    await expect(refundDue).toHaveText(amountDue);
    await expect(
      refundDue.locator("xpath=following-sibling::dd[1]"),
    ).toHaveText(reason);
  }

  async expectRefunded(day: string): Promise<void> {
    await this.expectSubscription({ Refunded: day });
    await expect(
      this.definitionOf(this.block("Subscription"), "Refund due"),
    ).toHaveCount(0);
  }

  async expectNoCoachingActions(): Promise<void> {
    await expect(this.onboarding).toBeVisible();

    for (const action of CANCELLED_OR_ENDED_ACTIONS) {
      await expect(this.page.getByRole("button", { name: action })).toHaveCount(
        0,
      );
    }
  }

  async expectReducedPrice(answer: ReducedPriceAnswer): Promise<void> {
    await expect(
      this.definitionOf(this.block("Subscription"), "Reduced price"),
    ).toHaveText(answer);
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
      .getByRole("textbox", { name: "What is missing? (required)" })
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

  async expectRatio(date: string, ratio: string): Promise<void> {
    await this.measurementsHistory.expectRatio(date, ratio);
  }

  async expectViewPhotos(date: string): Promise<void> {
    await this.measurementsHistory.expectViewPhotos(date);
  }

  async expectNoViewPhotos(date: string): Promise<void> {
    await this.measurementsHistory.expectNoViewPhotos(date);
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
      this.reviewDialog.getByRole("textbox", {
        name: "What is missing? (required)",
      }),
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

  async expectNoWeeklyCheckIn(): Promise<void> {
    await expect(
      this.weeklyPanel.getByText(NO_WEEKLY_CHECK_IN, { exact: true }),
    ).toBeVisible();
    await expect(this.setUpWeeklyButton).toBeEnabled();
    await expect(this.weeklyMenuTrigger).toHaveCount(0);
    await expect(this.viewAllCheckInsLink).toHaveCount(0);
  }

  async expectSetUpBlocked(gender: VisitorGender): Promise<void> {
    await this.setUpActionFor(gender).expectBlocked();
  }

  async expectSetUpReasonOnHover(gender: VisitorGender): Promise<void> {
    await this.setUpActionFor(gender).expectReasonOnHover();
  }

  async expectSetUpReasonOnFocus(gender: VisitorGender): Promise<void> {
    await this.setUpActionFor(gender).expectReasonOnFocus();
  }

  async expectSetUpReasonOnTap(gender: VisitorGender): Promise<void> {
    await this.setUpActionFor(gender).expectReasonOnTap();
  }

  async expectNoSetUpOnceCoachingEnded(gender: VisitorGender): Promise<void> {
    const { possessiveCapitalised } = clientPronouns(gender);

    await expect(
      this.weeklyPanel.getByText(
        `${possessiveCapitalised} coaching has ended, so no weekly check-in can be set up.`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      this.weeklyPanel.getByText(NO_WEEKLY_CHECK_IN, { exact: true }),
    ).toHaveCount(0);
    await expect(this.weeklyPanel.getByRole("button")).toHaveCount(0);
    await expect(this.weeklyPanel.getByRole("link")).toHaveCount(0);
  }

  async openWeeklyDialog(): Promise<void> {
    await this.openDialogWith(this.setUpWeeklyButton, this.weeklyDialog);
  }

  async openWeeklyMenu(): Promise<void> {
    await expect(async () => {
      if (!(await this.weeklyMenu.isVisible())) {
        await this.weeklyMenuTrigger.click();
      }
      await expect(this.weeklyMenu).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async openChangeDialog(): Promise<void> {
    await this.openWeeklyMenu();
    await this.weeklyMenuItem("Change").click();
    await expect(this.weeklyDialog).toBeVisible();
  }

  async openStopWeekly(): Promise<void> {
    await this.openWeeklyMenu();
    await this.weeklyMenuItem("Stop").click();
  }

  async openWeeklyDialogWithKeyboard(): Promise<void> {
    await expect(async () => {
      await tabTo(this.page, this.setUpWeeklyButton);
      await this.page.keyboard.press("Enter");
      await expect(this.weeklyDialog).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async openStopWeeklyWithKeyboard(): Promise<void> {
    await this.focusWeeklyMenuItemByKeyboard("Stop");
    await this.page.keyboard.press("Enter");
  }

  async expectWeeklyMenuFocused(): Promise<void> {
    await expect(this.weeklyMenuTrigger).toBeFocused();
  }

  async expectSetUpFocused(): Promise<void> {
    await expect(this.setUpWeeklyButton).toBeFocused();
  }

  async expectWeeklyRule(rule: string): Promise<void> {
    await expect(
      this.weeklyPanel.getByText(rule, { exact: true }),
    ).toBeVisible();
    await expect(this.weeklyMenuTrigger).toBeEnabled();
    await expect(this.setUpWeeklyButton).toHaveCount(0);
    await expect(this.viewAllCheckInsLink).toHaveAttribute(
      "href",
      CHECK_INS_PATH,
    );
  }

  async openAllCheckIns(): Promise<void> {
    await this.viewAllCheckInsLink.click();
    await expect(this.page).toHaveURL(CHECK_INS_PATH);
  }
}
