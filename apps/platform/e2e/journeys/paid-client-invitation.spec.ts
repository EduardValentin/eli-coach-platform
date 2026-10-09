import { endCall, findCallIdByEmail } from "../support/assessment-calls";
import { E2E_APP_URL } from "../support/e2e-app";
import { latestEmailTo, type CapturedEmail } from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { resolveRunId } from "../support/run-id";
import { deliverCheckoutCompleted } from "../support/stripe-events";
import { readCheckoutSubscription } from "../support/stripe-subscriptions";

const RUN_ID = resolveRunId();
const CLIENT_FIRST_NAME = "Ana";
const CLIENT_LAST_NAME = `Invitee ${RUN_ID}`;
const CLIENT_NAME = `${CLIENT_FIRST_NAME} ${CLIENT_LAST_NAME}`;
const INVITATION_SUBJECT = "Your place is booked — create your account.";
const FIVE_PART_INTRO = /Your next step is a short form in five parts/;
const ONBOARDING_PATH = "/client/onboarding";
const PAYMENT_LINK = /\/select-bundle#[\w-]+$/;
const INVITATION_LINK = /\/invitation#[\w-]+$/;
const JOURNEY_TIMEOUT_MS = 300_000;
const CHECKOUT_CARD = {
  brand: "visa",
  lastFour: "4242",
  expiryMonth: 12,
  expiryYear: 2034,
};

test(
  "a paid client receives her invitation, creates her account and lands on the welcome screen",
  { tag: "@critical" },
  async ({
    accountPortal,
    bookingPage,
    coachAssessmentCalls,
    page,
    paymentCardRecords,
    provisionAccount,
    publicNav,
    registerCheckoutSessionForCleanup,
    signIn,
    stripeCheckout,
    visitorEmail,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionAccount("COACH");

    // act
    await bookingPage.bookSoonestCall({
      email: visitorEmail,
      firstName: CLIENT_FIRST_NAME,
      lastName: CLIENT_LAST_NAME,
    });

    // assert
    await expect(
      page.getByRole("heading", { name: "You're booked!" }),
    ).toBeVisible();

    // arrange
    await endCall(await findCallIdByEmail(visitorEmail));
    await page.goto("/store");
    await signIn();
    await coachAssessmentCalls.open();
    await coachAssessmentCalls.search(visitorEmail);

    // act
    await coachAssessmentCalls.sendPaymentLink(CLIENT_NAME);

    // assert
    await expect(
      page.getByText(`Payment link sent to ${visitorEmail}.`),
    ).toBeVisible();

    // arrange
    const paymentLink = linkIn(await latestEmailTo(visitorEmail), PAYMENT_LINK);

    // act
    await page.goto(paymentLink);
    await page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: "3 Months" }) })
      .click();
    await page
      .getByRole("radio", {
        name: /Start as soon as my payment is confirmed\./,
      })
      .click();
    await page.getByRole("button", { name: "Continue to Checkout" }).click();
    const sessionId = await stripeCheckout.waitForOpenedSessionId();
    registerCheckoutSessionForCleanup(sessionId);
    await stripeCheckout.payWithTestCard(CLIENT_NAME);

    // assert
    await expect(
      page.getByRole("heading", { name: "Payment confirmed" }),
    ).toBeVisible();

    // act
    const delivery = await deliverCheckoutCompleted({
      baseURL: E2E_APP_URL,
      sessionId,
    });
    const subscription = await readCheckoutSubscription(sessionId);
    await coachAssessmentCalls.open();
    await coachAssessmentCalls.search(visitorEmail);
    const invitationEmail = await latestEmailTo(visitorEmail);

    // assert
    expect(delivery.status).toBe(200);
    expect(subscription.pause_collection).toEqual({
      behavior: "void",
      resumes_at: null,
    });
    expect(await paymentCardRecords.mirroredCardOf(visitorEmail)).toEqual(
      CHECKOUT_CARD,
    );
    await expect(
      coachAssessmentCalls.call(CLIENT_NAME).getByText("Paid", { exact: true }),
    ).toBeVisible();
    expect(invitationEmail.subject).toBe(INVITATION_SUBJECT);

    // arrange
    const invitationLink = linkIn(invitationEmail, INVITATION_LINK);

    // act
    await page.goto(invitationLink);

    // assert
    await expect(
      page.getByRole("heading", { name: "You're already signed in" }),
    ).toBeVisible();

    // act
    await accountPortal.signUpFromInvitation(() =>
      page.getByRole("button", { name: "Sign out" }).click(),
    );

    // assert
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: `Welcome to Evoa Fitness, ${CLIENT_FIRST_NAME}`,
      }),
    ).toBeVisible();
    await expect(page.getByText(FIVE_PART_INTRO)).toBeVisible();

    // act
    await page.getByRole("button", { name: "Let's get started" }).click();

    // assert
    await expect(page).toHaveURL(new RegExp(`${ONBOARDING_PATH}$`));

    // act
    await page.goto("/client");

    // assert
    await expect(page).toHaveURL(new RegExp(`${ONBOARDING_PATH}$`));

    // act
    await page.goto("/");

    // assert
    await publicNav.expectFinishOnboardingLink(ONBOARDING_PATH);

    // act
    await publicNav.signOut();
    await page.goto(invitationLink);

    // assert
    await expect(
      page.getByRole("heading", { name: "This invitation isn't available" }),
    ).toBeVisible();
  },
);

function linkIn(email: CapturedEmail, pattern: RegExp): string {
  const link = email.links.find((candidate) => pattern.test(candidate));

  if (!link) {
    throw new Error(`"${email.subject}" carries no link matching ${pattern}.`);
  }

  return link;
}
