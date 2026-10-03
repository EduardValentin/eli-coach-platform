import {
  COACH_NOTIFICATION_EMAIL,
  latestEmailTo,
} from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { daysAfter } from "../support/paid-clients";
import { readStripeSubscription } from "../support/stripe-subscriptions";
import { paidThrough } from "../support/subscribed-clients";
import { setPhoneViewport } from "../support/viewport";

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

test("a client on the waiting path cancels within her 14 days for a full refund and her portal closes", async ({
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
  await clientSettings.expectCancellationFacts(fullRefundFacts(client.paidAt));

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
});

test("a client who chose an immediate start cancels without a refund and keeps her access until her billing date", async ({
  clientDashboard,
  clientPortalShell,
  clientSettings,
  page,
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

  // act
  await clientPortalShell.openSettingsFromMoreSheet();

  // assert
  await clientSettings.expectOpen();
  await clientSettings.expectCancellationFacts(noRefundFacts(client.paidAt));

  // act
  const cancellation = await clientSettings.cancel("Cancel subscription");

  // assert
  await cancellation.expectOpen(noRefundFacts(client.paidAt));

  // act
  await cancellation.confirm();

  // assert
  await cancellation.expectClosed();
  await clientSettings.expectCancelledToast(dayOf(paidThrough(client.paidAt)));
  await clientSettings.expectSubscriptionHeadingFocused();
  await clientSettings.expectPlan(PLAN_TITLE, cancelledPlanLine(client.paidAt));
  await clientSettings.expectNoCancellation();
  await clientSettings.expectNoPaymentMethod();
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

  // act
  await clientDashboard.open();

  // assert
  await expect(page).toHaveURL(/\/client$/);
});

test("a client on the waiting path past her 14 days cancels without a refund", async ({
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
  await clientSettings.expectCancelledToast(dayOf(paidThrough(client.paidAt)));
  await clientSettings.expectPlan(PLAN_TITLE, cancelledPlanLine(client.paidAt));
  const subscription = await readStripeSubscription(
    client.subscription.subscriptionId,
  );
  expect(subscription.status).toBe("active");
  expect(subscription.cancel_at).not.toBeNull();
});

test("a client who opens the cancellation and keeps her coaching, by button, Escape or keyboard, changes nothing", async ({
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
  await clientSettings.open();

  // act
  const kept = await clientSettings.cancel("Cancel and get a full refund");
  await kept.dismiss();

  // assert
  await clientSettings.expectCancellationFacts(fullRefundFacts(client.paidAt));

  // act
  const escaped = await clientSettings.cancel("Cancel and get a full refund");
  await escaped.closeWithEscape();

  // assert
  await clientSettings.expectCancellationFacts(fullRefundFacts(client.paidAt));

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
  await clientSettings.expectCancellationFacts(fullRefundFacts(client.paidAt));
  const subscription = await readStripeSubscription(
    client.subscription.subscriptionId,
  );
  expect(subscription.status).toBe("active");
  expect(subscription.cancel_at).toBeNull();
});

test("a client on the waiting path lets Eli start now and from then a cancellation brings no refund", async ({
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
  await clientSettings.expectCancellationFacts(fullRefundFacts(client.paidAt));

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
});

test("a client opens Stripe's page to manage her payment method and comes back to her Settings", async ({
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
  await clientSettings.manage();

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
});
