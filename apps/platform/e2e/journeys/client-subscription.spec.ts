import {
  COACH_NOTIFICATION_EMAIL,
  latestEmailTo,
} from "../support/email-capture";
import { E2E_APP_URL } from "../support/e2e-app";
import { expect, test } from "../support/fixtures";
import { daysAfter } from "../support/paid-clients";
import { deliverStripeEvent } from "../support/stripe-events";
import {
  attachCardInStripe,
  readStripeSubscription,
  type StripeTestCard,
} from "../support/stripe-subscriptions";
import { paidThrough } from "../support/subscribed-clients";
import {
  expectNoHorizontalScroll,
  setPhoneViewport,
} from "../support/viewport";

const JOURNEY_TIMEOUT_MS = 180_000;
const WITHDRAWAL_DAYS = 14;
const CANCEL_AT_TOLERANCE_MS = 60_000;
const PLAN_TITLE = "3 months of coaching";
const FULL_REFUND_CONFIRMATION =
  "You'll get a full refund and your access ends right away.";
const IMMEDIATE_START_BODY =
  "I give up my 14-day right of withdrawal so Eli can start on my program now. If I cancel after that, there is no refund.";
const REFUND_DUE = "€447";
const PORTAL_PATHS = ["/client", "/client/settings", "/client/profile"];
const START_NOW_PROBLEM =
  "Your program couldn't be started just now. Nothing has changed, so please try again.";
const SUBMITTED_LABEL = "Sent to your coach";
const SUBMITTED_LINE = "Eli has your answers and will start on them soon.";
const CHANGED_CARD_TEST_PAYMENT_METHOD = "pm_card_visa_debit";
const NOTHING_TO_CANCEL = {
  error: "nothing-to-cancel",
  message: "This coaching has already ended, so there is nothing to cancel.",
};

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

const utcDayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function dayOf(instant: Date): string {
  return dayMonthFormatter.format(instant);
}

function cardExpiry(card: StripeTestCard): string {
  const month = String(card.expiryMonth).padStart(2, "0");
  const year = String(card.expiryYear % 100).padStart(2, "0");

  return `${month}/${year}`;
}

function waitingPlanLine(paidAt: Date): string {
  return `Paid ${dayOf(paidAt)} · starts when your program is delivered.`;
}

function cancelledPlanLine(paidAt: Date): string {
  return `Paid ${dayOf(paidAt)} · cancelled ${dayOf(new Date())} · access until ${dayOf(paidThrough(paidAt))}.`;
}

function fullRefundFacts(paidAt: Date): string {
  return `Until ${dayOf(daysAfter(paidAt, WITHDRAWAL_DAYS))} you can cancel for a full refund. Your access ends right away.`;
}

function noRefundFacts(paidAt: Date): string {
  return `You won't be charged again, there is no refund for the coaching already paid, and your access stays until ${dayOf(paidThrough(paidAt))}.`;
}

async function latestCoachNotificationSubject(): Promise<string | null> {
  try {
    return (await latestEmailTo(COACH_NOTIFICATION_EMAIL)).subject;
  } catch {
    return null;
  }
}

test(
  "a client on the waiting path cancels within her 14 days for a full refund and her portal closes",
  { tag: "@critical" },
  async ({
    clientDashboard,
    clientEnded,
    clientPortalShell,
    clientSettings,
    page,
    provisionSubscribedClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: 3,
    });
    await page.goto("/store");
    await signIn();
    await clientDashboard.open();

    // act
    await clientPortalShell.openSettingsFromSidebar();

    // assert
    await clientSettings.expectOpen();
    await clientPortalShell.expectSettingsCurrent();
    await clientSettings.expectPlan(PLAN_TITLE, waitingPlanLine(client.paidAt));
    await clientSettings.expectCancellationFacts(
      fullRefundFacts(client.paidAt),
    );

    // act
    const cancellation = await clientSettings.cancel(
      "Cancel and get a full refund",
    );

    // assert
    await cancellation.expectOpen(FULL_REFUND_CONFIRMATION);

    // act
    await cancellation.confirm();

    // assert
    await clientEnded.expectOpen();
    await clientEnded.expectRefundLine();
    await clientEnded.expectNoActions();
    const subscription = await readStripeSubscription(
      client.subscription.subscriptionId,
    );
    expect(subscription.status).toBe("canceled");
    await expect
      .poll(latestCoachNotificationSubject)
      .toBe(
        `${client.fullName} cancelled — refund due ${REFUND_DUE} by ${utcDayMonthFormatter.format(daysAfter(new Date(), WITHDRAWAL_DAYS))}`,
      );

    for (const path of PORTAL_PATHS) {
      // act
      await page.goto(path);

      // assert
      await clientEnded.expectOpen();
      await clientEnded.expectRefundLine();
    }
  },
);

test(
  "a client who chose an immediate start cancels without a refund and keeps her access until her billing date",
  { tag: "@completeness" },
  async ({
    clientDashboard,
    clientEnded,
    clientPortalShell,
    clientSettings,
    page,
    portalRequests,
    provisionSubscribedClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionSubscribedClient({
      start: "immediate",
      daysSincePayment: 3,
    });
    await page.goto("/store");
    await signIn();
    await clientDashboard.open();
    await setPhoneViewport(page);

    // assert
    await clientDashboard.expectNoStartNowOffer();

    // act
    await clientPortalShell.openSettingsFromMoreSheet();

    // assert
    await clientSettings.expectOpen();
    await clientSettings.expectPlan(PLAN_TITLE, waitingPlanLine(client.paidAt));
    await clientSettings.expectCancellationFacts(noRefundFacts(client.paidAt));
    await expectNoHorizontalScroll(page);

    // act
    const cancellation = await clientSettings.cancel("Cancel subscription");

    // assert
    await cancellation.expectOpen(noRefundFacts(client.paidAt));

    // act
    await cancellation.confirm();

    // assert
    await cancellation.expectClosed();
    await clientSettings.expectCancelledToast(
      dayOf(paidThrough(client.paidAt)),
    );
    await clientSettings.expectSubscriptionHeadingFocused();
    await clientSettings.expectPlan(
      PLAN_TITLE,
      cancelledPlanLine(client.paidAt),
    );
    await clientSettings.expectNoCancellation();
    await clientSettings.expectNoPaymentMethodRow();
    const subscription = await readStripeSubscription(
      client.subscription.subscriptionId,
    );
    expect(subscription.status).toBe("active");
    expect(
      Math.abs(
        (subscription.cancel_at ?? 0) * 1_000 -
          paidThrough(client.paidAt).getTime(),
      ),
    ).toBeLessThan(CANCEL_AT_TOLERANCE_MS);

    await expectNoHorizontalScroll(page);

    // act
    const secondCancellation = await portalRequests.cancelSubscription();

    // assert
    expect(secondCancellation).toEqual({
      status: 409,
      body: NOTHING_TO_CANCEL,
    });
    const unchanged = await readStripeSubscription(
      client.subscription.subscriptionId,
    );
    expect(unchanged.status).toBe("active");
    expect(unchanged.cancel_at).toBe(subscription.cancel_at);

    // act
    await clientDashboard.open();

    // assert
    await clientDashboard.expectOpen();
    await clientDashboard.expectNoStartNowOffer();

    // act
    await clientEnded.visit();

    // assert
    await clientDashboard.expectOpen();

    // act
    await clientEnded.visitWithTrailingSlash();

    // assert
    await clientDashboard.expectOpen();
  },
);

test(
  "a client on the waiting path past her 14 days cancels without a refund",
  { tag: "@completeness" },
  async ({
    clientDashboard,
    clientSettings,
    page,
    provisionSubscribedClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: 20,
    });
    await page.goto("/store");
    await signIn();

    // act
    await clientDashboard.open();

    // assert
    await clientDashboard.expectNoStartNowOffer();
    await clientDashboard.expectNoWorkStartLine();
    await clientDashboard.expectStatusCard(SUBMITTED_LABEL, SUBMITTED_LINE);

    // act
    await clientSettings.open();

    // assert
    await clientSettings.expectPlan(PLAN_TITLE, waitingPlanLine(client.paidAt));
    await clientSettings.expectCancellationFacts(noRefundFacts(client.paidAt));

    // act
    const cancellation = await clientSettings.cancel("Cancel subscription");

    // assert
    await cancellation.expectOpen(noRefundFacts(client.paidAt));

    // act
    await cancellation.confirm();

    // assert
    await clientSettings.expectCancelledToast(
      dayOf(paidThrough(client.paidAt)),
    );
    await clientSettings.expectPlan(
      PLAN_TITLE,
      cancelledPlanLine(client.paidAt),
    );
    const subscription = await readStripeSubscription(
      client.subscription.subscriptionId,
    );
    expect(subscription.status).toBe("active");
    expect(subscription.cancel_at).not.toBeNull();
  },
);

test(
  "a client who opens the cancellation and keeps her coaching, by button, Escape or keyboard, changes nothing",
  { tag: "@completeness" },
  async ({ clientSettings, page, provisionSubscribedClient, signIn }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: 3,
    });
    await page.goto("/store");
    await signIn();
    await clientSettings.open();

    // act
    const kept = await clientSettings.cancel("Cancel and get a full refund");
    await kept.dismiss();

    // assert
    await clientSettings.expectCancellationFacts(
      fullRefundFacts(client.paidAt),
    );

    // act
    const escaped = await clientSettings.cancel("Cancel and get a full refund");
    await escaped.closeWithEscape();

    // assert
    await clientSettings.expectCancellationFacts(
      fullRefundFacts(client.paidAt),
    );

    // act
    const keyboard = await clientSettings.cancelWithKeyboard(
      "Cancel and get a full refund",
    );
    await keyboard.tabWithin();
    await keyboard.closeWithEscape();

    // assert
    await clientSettings.expectCancelFocused();

    // act
    await clientSettings.open();

    // assert
    await clientSettings.expectPlan(PLAN_TITLE, waitingPlanLine(client.paidAt));
    await clientSettings.expectCancellationFacts(
      fullRefundFacts(client.paidAt),
    );
    const subscription = await readStripeSubscription(
      client.subscription.subscriptionId,
    );
    expect(subscription.status).toBe("active");
    expect(subscription.cancel_at).toBeNull();
  },
);

test(
  "a client on the waiting path lets Eli start now and from then a cancellation brings no refund",
  { tag: "@completeness" },
  async ({
    clientDashboard,
    clientSettings,
    coachClient,
    page,
    provisionCoach,
    provisionSubscribedClient,
    publicNav,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: 3,
    });
    await page.goto("/store");
    await signIn();

    // act
    await clientDashboard.open();

    // assert
    await clientDashboard.expectStartNowOffer();

    // act
    const kept = await clientDashboard.openStartNow();

    // assert
    await kept.expectOpen(IMMEDIATE_START_BODY);

    // act
    await kept.dismiss();
    await clientSettings.open();

    // assert
    await clientSettings.expectCancellationFacts(
      fullRefundFacts(client.paidAt),
    );

    // act
    await clientDashboard.open();
    const started = await clientDashboard.openStartNow();
    await started.confirm();

    // assert
    await started.expectClosed();
    await clientDashboard.expectNoStartNowOffer();

    // act
    await clientSettings.open();

    // assert
    await clientSettings.expectCancellationFacts(noRefundFacts(client.paidAt));

    // act
    await page.goto("/");
    await publicNav.signOut();
    await signInAsCoach();
    await coachClient.open(client.clientId);

    // assert
    await coachClient.expectSubscription({ Start: "Immediate start" });
  },
);

test(
  "a client opens Stripe's page to change her payment method and comes back to her Settings",
  { tag: "@completeness" },
  async ({
    clientSettings,
    page,
    provisionSubscribedClient,
    signIn,
    stripeBillingPortal,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionSubscribedClient({
      start: "immediate",
      daysSincePayment: 3,
    });
    await page.goto("/store");
    await signIn();
    await clientSettings.open();

    // act
    await clientSettings.change();

    // assert
    await stripeBillingPortal.expectOpen();
    await stripeBillingPortal.expectPaymentMethodUpdate();
    expect(await stripeBillingPortal.title()).toBe(
      "Add payment method | Evoa Billing",
    );

    // act
    await clientSettings.open();

    // assert
    await clientSettings.expectPlan(PLAN_TITLE, waitingPlanLine(client.paidAt));
    await clientSettings.expectCancellationFacts(noRefundFacts(client.paidAt));
    await clientSettings.expectNoHandOffProblem();
    await clientSettings.expectNoPaymentProblem();

    // act
    await clientSettings.openAfterFailedHandOff();

    // assert
    await clientSettings.expectHandOffFailed();
    await clientSettings.expectNoPaymentProblem();
  },
);

test(
  "a client sees her card on file and changes it through Stripe",
  { tag: "@completeness" },
  async ({
    clientSettings,
    page,
    provisionSubscribedClient,
    signIn,
    stripeBillingPortal,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionSubscribedClient({
      start: "immediate",
      daysSincePayment: 3,
    });
    const seededCard = client.subscription.card;
    await page.goto("/store");
    await signIn();

    // act
    await clientSettings.open();

    // assert
    await clientSettings.expectCardOnFile({
      brand: "Visa",
      lastFour: seededCard.lastFour,
      expiry: cardExpiry(seededCard),
    });

    // act
    await clientSettings.change();

    // assert
    await stripeBillingPortal.expectOpen();
    await stripeBillingPortal.expectPaymentMethodUpdate();

    // act
    const changed = await attachCardInStripe(
      client.subscription,
      CHANGED_CARD_TEST_PAYMENT_METHOD,
    );
    const delivery = await deliverStripeEvent({
      baseURL: E2E_APP_URL,
      type: "payment_method.attached",
      objectId: changed.card.paymentMethodId,
      causedBy: changed.requestId,
    });
    await clientSettings.open();

    // assert
    expect(changed.card.lastFour).not.toBe(seededCard.lastFour);
    expect(delivery.status).toBe(200);
    await clientSettings.expectCardOnFile({
      brand: "Visa",
      lastFour: changed.card.lastFour,
      expiry: cardExpiry(changed.card),
    });
  },
);

test(
  "a client reaches Let Eli start now by keyboard, focus stays in its dialog and returns when she keeps her 14 days",
  { tag: "@completeness" },
  async ({
    clientDashboard,
    clientSettings,
    page,
    provisionSubscribedClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: 3,
    });
    await page.goto("/store");
    await signIn();
    await clientDashboard.open();

    // act
    const dialog = await clientDashboard.openStartNowWithKeyboard();

    // assert
    await dialog.expectOpen(IMMEDIATE_START_BODY);
    await dialog.expectFocusTrapped();

    // act
    await dialog.closeWithEscape();

    // assert
    await clientDashboard.expectStartNowFocused();
    await clientDashboard.expectStartNowOffer();

    // act
    await clientSettings.open();

    // assert
    await clientSettings.expectCancellationFacts(
      fullRefundFacts(client.paidAt),
    );
  },
);

test(
  "once her coaching has ended a client has nothing left to cancel, start, manage or save",
  { tag: "@completeness" },
  async ({
    clientEnded,
    page,
    portalRequests,
    provisionSubscribedClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: 3,
    });
    await page.goto("/store");
    await signIn();

    // act
    const cancellation = await portalRequests.cancelSubscription();

    // assert
    expect(cancellation).toMatchObject({
      status: 200,
      body: { status: "cancelled", rule: "full-refund", refundDue: true },
    });

    // act
    const refusals = {
      cancel: await portalRequests.cancelSubscription(),
      startNow: await portalRequests.startProgramNow(),
      paymentMethod: await portalRequests.openPaymentMethod(),
      draft: await portalRequests.saveOnboardingDraft(),
    };

    // assert
    expect(refusals.cancel).toEqual({ status: 409, body: NOTHING_TO_CANCEL });
    expect(refusals.startNow.status).toBe(409);
    expect(refusals.paymentMethod).toEqual({
      status: 303,
      location: "/client/ended",
    });
    expect(refusals.draft).toEqual({ status: 409, body: { error: "ended" } });
    const subscription = await readStripeSubscription(
      client.subscription.subscriptionId,
    );
    expect(subscription.status).toBe("canceled");

    // act
    await page.goto("/client/settings");

    // assert
    await clientEnded.expectOpen();
    await clientEnded.expectRefundLine();
  },
);

test(
  "a client's subscription routes refuse a signed-out visitor, a coach and any method but POST",
  { tag: "@completeness" },
  async ({
    page,
    portalRequests,
    provisionCoach,
    provisionSubscribedClient,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: 3,
    });

    // act
    const anonymous = {
      cancel: await portalRequests.cancelSubscription(),
      startNow: await portalRequests.startProgramNow(),
      paymentMethod: await portalRequests.openPaymentMethod(),
      reads: await portalRequests.readSubscriptionRoutes(),
    };

    // assert
    expect(anonymous.cancel.status).toBe(401);
    expect(anonymous.startNow.status).toBe(401);
    expect(anonymous.paymentMethod).toEqual({ status: 401, location: null });
    expect(anonymous.reads).toEqual([405, 405, 405]);

    // act
    await page.goto("/");
    await signInAsCoach();
    const coach = {
      cancel: await portalRequests.cancelSubscription(),
      startNow: await portalRequests.startProgramNow(),
      paymentMethod: await portalRequests.openPaymentMethod(),
    };

    // assert
    expect(coach.cancel.status).toBe(403);
    expect(coach.startNow.status).toBe(403);
    expect(coach.paymentMethod).toEqual({ status: 403, location: null });
    const subscription = await readStripeSubscription(
      client.subscription.subscriptionId,
    );
    expect(subscription.status).toBe("active");
    expect(subscription.cancel_at).toBeNull();
  },
);

test(
  "a client account without a subscription has nothing to cancel, start or manage",
  { tag: "@completeness" },
  async ({ page, portalRequests, provisionAccount, signIn }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionAccount("CLIENT");
    await page.goto("/store");
    await signIn();

    // act
    const answers = {
      cancel: await portalRequests.cancelSubscription(),
      startNow: await portalRequests.startProgramNow(),
      paymentMethod: await portalRequests.openPaymentMethod(),
    };

    // assert
    expect(answers.cancel).toEqual({
      status: 404,
      body: { error: "not-found" },
    });
    expect(answers.startNow.status).toBe(404);
    expect(answers.paymentMethod.status).toBe(404);
  },
);

test(
  "a cancellation refused while her dialog is open is worded in the dialog and clears when she keeps her coaching or presses Escape",
  { tag: "@completeness" },
  async ({
    clientSettings,
    page,
    portalRequests,
    provisionSubscribedClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionSubscribedClient({
      start: "immediate",
      daysSincePayment: 3,
    });
    await page.goto("/store");
    await signIn();
    await clientSettings.open();
    const kept = await clientSettings.cancel("Cancel subscription");
    expect((await portalRequests.cancelSubscription()).status).toBe(200);

    // act
    await kept.confirm();

    // assert
    await kept.expectProblem(NOTHING_TO_CANCEL.message);

    // act
    await kept.dismiss();
    const reopened = await clientSettings.cancel("Cancel subscription");

    // assert
    await reopened.expectNoProblem();

    // act
    await reopened.confirm();
    await reopened.expectProblem(NOTHING_TO_CANCEL.message);
    await reopened.closeWithEscape();
    const escaped = await clientSettings.cancel("Cancel subscription");

    // assert
    await escaped.expectNoProblem();
  },
);

test(
  "a start-now refused while her dialog is open is worded in the dialog and clears when she keeps her 14 days or presses Escape",
  { tag: "@completeness" },
  async ({
    clientDashboard,
    page,
    portalRequests,
    provisionSubscribedClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionSubscribedClient({ start: "waiting", daysSincePayment: 3 });
    await page.goto("/store");
    await signIn();
    await clientDashboard.open();
    const kept = await clientDashboard.openStartNow();
    expect((await portalRequests.startProgramNow()).status).toBe(200);

    // act
    await kept.confirm();

    // assert
    await kept.expectProblem(START_NOW_PROBLEM);

    // act
    await kept.dismiss();
    const reopened = await clientDashboard.openStartNow();

    // assert
    await reopened.expectNoProblem();

    // act
    await reopened.confirm();
    await reopened.expectProblem(START_NOW_PROBLEM);
    await reopened.closeWithEscape();
    const escaped = await clientDashboard.openStartNow();

    // assert
    await escaped.expectNoProblem();
  },
);

test(
  "a client's Settings read her card on file without ever sending its payment method",
  { tag: "@completeness" },
  async ({ clientSettings, page, provisionSubscribedClient, signIn }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: 3,
    });
    await page.goto("/store");
    await signIn();

    // act
    await clientSettings.open();
    const payload = await clientSettings.readLoaderPayload();

    // assert
    await clientSettings.expectCardOnFile({
      brand: "Visa",
      lastFour: client.subscription.card.lastFour,
      expiry: cardExpiry(client.subscription.card),
    });
    expect(payload).toContain(client.subscription.card.lastFour);
    expect(payload).not.toContain(client.subscription.card.paymentMethodId);
    expect(payload).not.toMatch(/\bpm_[A-Za-z0-9]+/);
    expect(payload).not.toContain(client.subscription.customerId);
  },
);
