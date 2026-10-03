import { E2E_APP_URL } from "../support/e2e-app";
import { expect, test } from "../support/fixtures";
import {
  deliverSimulatedRenewalFailure,
  deliverStripeEvent,
} from "../support/stripe-events";
import { daysAfter } from "../support/paid-clients";
import {
  cancelInStripe,
  liftScheduledEndInStripe,
  scheduleEndInStripe,
} from "../support/stripe-subscriptions";
import { paidThrough } from "../support/subscribed-clients";
import { PROTOTYPE_DETAIL_REQUEST } from "../support/submitted-clients";

const JOURNEY_TIMEOUT_MS = 180_000;
const PLAN_TITLE = "3 months of coaching";
const SCHEDULED_END_DAYS = 40;

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

function dayOf(instant: Date): string {
  return dayMonthFormatter.format(instant);
}

test("Eli cancels a subscription in Stripe, the client's portal closes and the coach sees her coaching ended with nothing left to act on", async ({
  clientEnded,
  coachClient,
  coachClients,
  page,
  portalRequests,
  provisionCoach,
  provisionSubscribedClient,
  publicNav,
  scenarioTag,
  signIn,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const client = await provisionSubscribedClient({
    start: "immediate",
    daysSincePayment: 3,
  });
  const cancellation = await cancelInStripe(client.subscription);

  // act
  const delivery = await deliverStripeEvent({
    baseURL: E2E_APP_URL,
    type: "customer.subscription.deleted",
    objectId: client.subscription.subscriptionId,
    causedBy: cancellation.requestId,
  });
  await page.goto("/store");
  await signIn();
  await page.goto("/client");

  // assert
  expect(delivery.status).toBe(200);
  await clientEnded.expectOpen();
  await clientEnded.expectNoRefundLine();

  // act
  await page.goto("/");
  await publicNav.signOut();
  await signInAsCoach();
  await coachClients.open();
  await coachClients.search(scenarioTag);

  // assert
  await coachClients.expectRow(client.fullName, "Inactive");
  await coachClients.expectRowWithoutRefundBadge(client.fullName);

  // act
  await coachClients.openClient(client.fullName);

  // assert
  await coachClient.expectOpen(client.clientId);
  await coachClient.expectSubscription({
    "Ended on": dayMonthFormatter.format(new Date()),
  });
  await coachClient.expectNoNeedsRefundBadge(client.fullName);
  await coachClient.expectNoCoachingActions();

  // act
  const refusals = [
    await portalRequests.openReview(client.clientId),
    await portalRequests.requestDetails(
      client.clientId,
      PROTOTYPE_DETAIL_REQUEST,
    ),
    await portalRequests.approveAnswers(client.clientId),
  ];

  // assert
  expect(refusals).toEqual([409, 409, 409]);
});

test("a renewal that fails shows the client a payment problem and a way to update her card", async ({
  clientDashboard,
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

  // act
  const deliveries = await deliverSimulatedRenewalFailure({
    baseURL: E2E_APP_URL,
    subscriptionId: client.subscription.subscriptionId,
  });
  await page.goto("/store");
  await signIn();
  await clientDashboard.open();

  // assert
  expect(deliveries.map((delivery) => delivery.status)).toEqual([200, 200]);
  await clientDashboard.expectPaymentProblem();

  // act
  await clientSettings.open();

  // assert
  await clientSettings.expectPaymentProblem();

  // act
  await clientDashboard.open();
  await clientDashboard.managePaymentMethod();

  // assert
  await stripeBillingPortal.expectOpen();
  await stripeBillingPortal.expectPaymentMethodUpdate();
});

test("Eli schedules the end of a subscription in Stripe and lifts it again, and the client's Settings follow each change", async ({
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
  const endsAt = daysAfter(new Date(), SCHEDULED_END_DAYS);
  const scheduled = await scheduleEndInStripe(client.subscription, endsAt);

  // act
  const scheduledDelivery = await deliverStripeEvent({
    baseURL: E2E_APP_URL,
    type: "customer.subscription.updated",
    objectId: client.subscription.subscriptionId,
    causedBy: scheduled.requestId,
  });
  const redelivery = await deliverStripeEvent({
    baseURL: E2E_APP_URL,
    type: "customer.subscription.updated",
    objectId: client.subscription.subscriptionId,
    causedBy: scheduled.requestId,
  });
  await page.goto("/store");
  await signIn();
  await clientSettings.open();

  // assert
  expect(scheduledDelivery.status).toBe(200);
  expect(redelivery.status).toBe(200);
  await clientSettings.expectPlan(
    PLAN_TITLE,
    `Paid ${dayOf(client.paidAt)} · cancelled ${dayOf(new Date())} · access until ${dayOf(endsAt)}.`,
  );
  await clientSettings.expectNoCancellation();

  // arrange
  const lifted = await liftScheduledEndInStripe(client.subscription);

  // act
  const liftedDelivery = await deliverStripeEvent({
    baseURL: E2E_APP_URL,
    type: "customer.subscription.updated",
    objectId: client.subscription.subscriptionId,
    causedBy: lifted.requestId,
  });
  await clientSettings.open();

  // assert
  expect(liftedDelivery.status).toBe(200);
  await clientSettings.expectPlan(
    PLAN_TITLE,
    `Paid ${dayOf(client.paidAt)} · starts when your program is delivered.`,
  );
  await clientSettings.expectCancellationFacts(
    `You won't be charged again, there is no refund for the coaching already paid, and your access stays until ${dayOf(paidThrough(client.paidAt))}.`,
  );
});
