import { E2E_APP_URL } from "../support/e2e-app";
import { expect, test } from "../support/fixtures";
import { daysAfter } from "../support/paid-clients";
import { deliverStripeEvent } from "../support/stripe-events";
import {
  refundPartInStripe,
  refundRestInStripe,
} from "../support/stripe-subscriptions";

const JOURNEY_TIMEOUT_MS = 300_000;
const WITHDRAWAL_DAYS = 14;
const PARTIAL_REFUND_CENTS = 10_000;
const FULL_REFUND_REASON =
  "Full refund: cancelled within the 14-day withdrawal period.";

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

test("the coach sees the refund a cancellation owes, follows her refunds in Stripe and the badge goes once it is paid back", async ({
  clientEnded,
  clientSettings,
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
    start: "waiting",
    daysSincePayment: 3,
  });
  await page.goto("/store");
  await signIn();
  await clientSettings.open();
  const cancellation = await clientSettings.cancel(
    "Cancel and get a full refund",
  );
  await cancellation.confirm();
  await clientEnded.expectOpen();
  const today = dayMonthFormatter.format(new Date());
  const refundBy = dayMonthFormatter.format(
    daysAfter(new Date(), WITHDRAWAL_DAYS),
  );
  await page.goto("/");
  await publicNav.signOut();
  await signInAsCoach();

  // act
  await coachClients.open();
  await coachClients.search(scenarioTag);

  // assert
  await coachClients.expectRowNeedsRefund(client.fullName, "Inactive");

  // act
  await coachClients.openClient(client.fullName);

  // assert
  await coachClient.expectOpen(client.clientId);
  await coachClient.expectNeedsRefundBadge(client.fullName);
  await coachClient.expectSubscription({ "Ended on": today });
  await coachClient.expectRefundDue(`€447 by ${refundBy}`, FULL_REFUND_REASON);
  await coachClient.expectNoCoachingActions();

  // arrange
  const partialRefund = await refundPartInStripe(
    client.subscription,
    PARTIAL_REFUND_CENTS,
  );

  // act
  const partialDelivery = await deliverStripeEvent({
    baseURL: E2E_APP_URL,
    type: "charge.refunded",
    objectId: partialRefund.chargeId,
    causedBy: partialRefund.requestId,
  });
  await coachClient.open(client.clientId);

  // assert
  expect(partialDelivery.status).toBe(200);
  await coachClient.expectNeedsRefundBadge(client.fullName);
  await coachClient.expectRefundDue(
    `€347 by ${refundBy}`,
    `${FULL_REFUND_REASON} €100 refunded so far.`,
  );

  // arrange
  const restRefund = await refundRestInStripe(client.subscription);

  // act
  const restDelivery = await deliverStripeEvent({
    baseURL: E2E_APP_URL,
    type: "charge.refunded",
    objectId: restRefund.chargeId,
    causedBy: restRefund.requestId,
  });
  await coachClient.open(client.clientId);

  // assert
  expect(restDelivery.status).toBe(200);
  await coachClient.expectRefunded(today);
  await coachClient.expectNoNeedsRefundBadge(client.fullName);

  // act
  await coachClients.open();
  await coachClients.search(scenarioTag);

  // assert
  await coachClients.expectRow(client.fullName, "Inactive");
  await coachClients.expectRowWithoutRefundBadge(client.fullName);

  // act
  await page.goto("/");
  await publicNav.signOut();
  await signIn();
  await page.goto("/client");

  // assert
  await clientEnded.expectOpen();
  await clientEnded.expectNoRefundLine();
});
