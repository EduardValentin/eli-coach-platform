import { E2E_APP_URL } from "../support/e2e-app";
import { expect, test } from "../support/fixtures";
import {
  deliverSimulatedRenewalFailure,
  deliverStripeEvent,
} from "../support/stripe-events";
import { cancelInStripe } from "../support/stripe-subscriptions";

const JOURNEY_TIMEOUT_MS = 180_000;

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

test("Eli cancels a subscription in Stripe, the client's portal closes and the coach sees her coaching ended with nothing left to act on", async ({
  clientEnded,
  coachClient,
  coachClients,
  page,
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
