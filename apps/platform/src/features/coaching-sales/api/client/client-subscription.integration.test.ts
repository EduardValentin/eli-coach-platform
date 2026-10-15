import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { CheckInsJourney } from "~integration-test-config/check-ins-journey";
import {
  ClientsJourney,
  type ClientStanding,
} from "~integration-test-config/clients-journey";
import {
  ClientOnboardingJourney,
  regularSubmission,
} from "~integration-test-config/client-onboarding-journey";
import {
  ANA,
  CALL_ENDED_INSTANT,
  CoachingSalesJourney,
  FIRST_PURCHASE,
  SECOND_PURCHASE,
  type Purchase,
  type Visitor,
} from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import {
  stripeInvoiceObject,
  stripeRefundedChargeObject,
  stripeSubscriptionObject,
  SubscriptionLifecycleJourney,
} from "~integration-test-config/subscription-lifecycle-journey";
import {
  STRIPE_BILLING_PORTAL_SESSIONS_PATH,
  STRIPE_BILLING_PORTAL_URL,
  STRIPE_PORTAL_CONFIGURATION_ID,
  STRIPE_CUSTOMER_ID,
  paymentIntentOf,
  stripeRefusesBillingPortalSessions,
  stripeRefusesSubscriptionCancellation,
  toUnixSeconds,
} from "~integration-test-config/wire-mock/expectations/stripe-api";

const COACH_EMAIL = "coach@evoa.fit";

const suite = new ApiIntegrationTestSuite({
  environment: { ASSESSMENT_CALL_COACH_EMAIL: COACH_EMAIL },
});
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const clients = new ClientsJourney(rig);
const lifecycle = new SubscriptionLifecycleJourney(rig);
const checkIns = new CheckInsJourney(rig);

const CANCELLATION_API = "/api/coaching-sales/subscription-cancellation";
const PROGRAM_START_API = "/api/coaching-sales/program-start";
const PAYMENT_METHOD_API = "/api/coaching-sales/payment-method-session";
const CLIENT_PORTAL = "/client";
const ENDED_PAGE = "/client/ended";
const SETTINGS_RETURN_URL =
  "https://localhost:3000/eli-coach-platform/client/settings";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const DAY_13 = new Date(
  CALL_ENDED_INSTANT.getTime() + 13 * DAY_IN_MILLISECONDS,
);
const DAY_14 = new Date(
  CALL_ENDED_INSTANT.getTime() + 14 * DAY_IN_MILLISECONDS,
);
const REFUND_DUE_BY = new Date(DAY_13.getTime() + 14 * DAY_IN_MILLISECONDS);
const PAID_THROUGH = new Date("2027-01-21T08:00:00.000Z");
const WEEK_BEFORE_PAID_THROUGH = new Date("2027-01-14T09:00:00.000Z");
const CHECK_IN_BEFORE_PAID_THROUGH = "2027-01-20T15:00:00.000Z";
const CHECK_IN_ON_PAID_THROUGH_DAY = "2027-01-21T15:00:00.000Z";
const CHECK_IN_AFTER_PAID_THROUGH = "2027-01-22T15:00:00.000Z";
const CHECK_IN_AFTER_DAY_13 = "2026-11-05T15:00:00.000Z";
const LATER_CHECK_IN_AFTER_DAY_13 = "2026-11-06T15:00:00.000Z";

const ANA_SESSION: AccountSession = {
  sessionId: "sess_subscription_ana",
  subjectId: "user_subscription_ana",
};

const MARIA_SESSION: AccountSession = {
  sessionId: "sess_subscription_maria",
  subjectId: "user_subscription_maria",
};

const MARIA: Visitor = {
  email: "maria.subscription@example.com",
  firstName: "Maria",
  gender: "female",
  lastName: "Ionescu",
};

const PURCHASED_STANDING: ClientStanding = {
  bookingTimeZone: "Europe/London",
  coachingAccessEndsAt: null,
  coachingBundleMonths: 3,
  coachingRefundDue: false,
  coachingStatus: "not-started",
};

const WAITING_PURCHASE: Purchase = {
  ...FIRST_PURCHASE,
  startChoice: "waiting",
};

describe.sequential("client subscription integration", () => {
  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = COACH_SESSION.subjectId;
    await suite.start();
  });

  beforeEach(async () => {
    await rig.switchWaitlistModeOff();
    await rig.provisionCoach();
  });

  afterEach(async () => {
    rig.releaseClock();
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  describe("cancelling", () => {
    it("ends a waiting-path subscription in Stripe now, owes her a full refund, emails the coach and closes her portal", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_13);

      // act
      const response = await cancel(ANA_SESSION);

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        status: "cancelled",
        rule: "full-refund",
        accessEndsAt: DAY_13.toISOString(),
        refundDue: true,
      });
      const [ending] = await lifecycle.providerSubscriptionRequests("DELETE");
      expect(ending?.get("prorate")).toBe("false");
      expect(ending?.get("invoice_now")).toBe("false");
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        status: "ended",
        cancelledAt: DAY_13,
        accessEndsAt: DAY_13,
        refundReason: "full-refund",
        refundDueCents: 44700,
        refundDueBy: REFUND_DUE_BY,
        refundedCents: 0,
        refundedAt: null,
      });
      expect(await clients.standingOf(ANA.email)).toEqual({
        ...PURCHASED_STANDING,
        coachingStatus: "ended",
        coachingAccessEndsAt: DAY_13,
        coachingRefundDue: true,
      });
      const [refundDueEmail, ...otherRefundDueEmails] = await refundDueEmails();
      expect(otherRefundDueEmails).toEqual([]);
      expect(refundDueEmail?.subject).toBe(
        "Ana Popescu cancelled — refund due €447 by 17 November",
      );
      expect(refundDueEmail?.replyTo).toBe(ANA.email);
      const portal = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);
      expect(portal.status).toBe(302);
      expect(portal.headers.get("location")).toBe(suite.path(ENDED_PAGE));
    });

    it("schedules the end in Stripe at purchase plus the bundle months on the immediate path within the 14 days, owing nothing and keeping her portal open", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, FIRST_PURCHASE);
      await rig.holdClock(DAY_13);

      // act
      const response = await cancel(ANA_SESSION);

      // assert
      expect(await response.json()).toEqual({
        status: "cancelled",
        rule: "no-refund",
        accessEndsAt: PAID_THROUGH.toISOString(),
        refundDue: false,
      });
      const scheduling = (
        await lifecycle.providerSubscriptionRequests("POST")
      ).at(-1);
      expect(scheduling?.get("cancel_at")).toBe(
        String(toUnixSeconds(PAID_THROUGH)),
      );
      expect(scheduling?.get("proration_behavior")).toBe("none");
      expect(await lifecycle.providerSubscriptionRequests("DELETE")).toEqual(
        [],
      );
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        status: "cancelled",
        cancelledAt: DAY_13,
        accessEndsAt: PAID_THROUGH,
        refundReason: null,
      });
      expect(await clients.standingOf(ANA.email)).toEqual({
        ...PURCHASED_STANDING,
        coachingStatus: "cancelled",
        coachingAccessEndsAt: PAID_THROUGH,
      });
      expect(await refundDueEmails()).toEqual([]);
      const portal = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);
      expect(portal.headers.get("location")).not.toBe(suite.path(ENDED_PAGE));
    });

    it("schedules the end in Stripe at purchase plus the bundle months once the withdrawal right is gone, owing nothing and keeping her portal open", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_14);

      // act
      const response = await cancel(ANA_SESSION);

      // assert
      expect(await response.json()).toEqual({
        status: "cancelled",
        rule: "no-refund",
        accessEndsAt: PAID_THROUGH.toISOString(),
        refundDue: false,
      });
      const scheduling = (
        await lifecycle.providerSubscriptionRequests("POST")
      ).at(-1);
      expect(scheduling?.get("cancel_at")).toBe(
        String(toUnixSeconds(PAID_THROUGH)),
      );
      expect(scheduling?.get("proration_behavior")).toBe("none");
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        status: "cancelled",
        cancelledAt: DAY_14,
        accessEndsAt: PAID_THROUGH,
        refundReason: null,
      });
      expect(await refundDueEmails()).toEqual([]);
      const portal = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);
      expect(portal.headers.get("location")).toBe(
        suite.path("/client/welcome"),
      );
    });

    it("closes her portal once the access a cancellation kept runs out", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_14);
      await cancel(ANA_SESSION);
      await rig.holdClock(PAID_THROUGH);

      // act
      const portal = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);

      // assert
      expect(portal.status).toBe(302);
      expect(portal.headers.get("location")).toBe(suite.path(ENDED_PAGE));
    });

    it("leaves her subscription as it was and asks her to try again when Stripe refuses", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_13);
      await suite.wireMock.stub(stripeRefusesSubscriptionCancellation());

      // act
      const response = await cancel(ANA_SESSION);

      // assert
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "provider-unavailable" });
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        status: "not-started",
        cancelledAt: null,
        refundReason: null,
      });
      expect(await clients.standingOf(ANA.email)).toEqual(PURCHASED_STANDING);
      expect(await refundDueEmails()).toEqual([]);
    });

    it("has nothing to cancel once her coaching has ended", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_13);
      await cancel(ANA_SESSION);

      // act
      const response = await cancel(ANA_SESSION);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "nothing-to-cancel",
        message:
          "This coaching has already ended, so there is nothing to cancel.",
      });
      expect(
        await lifecycle.providerSubscriptionRequests("DELETE"),
      ).toHaveLength(1);
    });

    it("cancels only the subscription of the client who is signed in", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await onboarding.admit(MARIA, MARIA_SESSION, {
        ...SECOND_PURCHASE,
        startChoice: "waiting",
      });
      await rig.holdClock(DAY_13);

      // act
      const response = await cancel(MARIA_SESSION);

      // assert
      expect(response.status).toBe(200);
      expect(
        await lifecycle.subscriptionRow(SECOND_PURCHASE.subscriptionId),
      ).toMatchObject({ status: "ended" });
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        status: "not-started",
      });
      expect(await lifecycle.providerSubscriptionRequests("DELETE")).toEqual(
        [],
      );
    });

    it("refuses the coach with 403 without touching any subscription", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_13);

      // act
      const response = await cancel(COACH_SESSION);

      // assert
      expect(response.status).toBe(403);
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        status: "not-started",
      });
    });

    it("refuses an anonymous request with 401", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);

      // act
      const response = await suite.request(
        new Request(suite.url(CANCELLATION_API), { method: "POST" }),
      );

      // assert
      expect(response.status).toBe(401);
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        status: "not-started",
      });
    });

    it("answers any method but POST with 405", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);

      // act
      const response = await rig.requestAs(ANA_SESSION, CANCELLATION_API);

      // assert
      expect(response.status).toBe(405);
    });
  });

  describe("the portal once her coaching has ended", () => {
    it.each([
      CLIENT_PORTAL,
      "/client/profile",
      "/client/welcome",
      "/client/onboarding",
    ])("sends her from %s to the ended page", async (page) => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_13);
      await cancel(ANA_SESSION);

      // act
      const response = await rig.requestAs(ANA_SESSION, page);

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(suite.path(ENDED_PAGE));
    });

    it("sends her to the ended page once Stripe ends her subscription", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await lifecycle.deliverEvent({
        id: "evt_subscription_ended_in_stripe",
        type: "customer.subscription.deleted",
        object: stripeSubscriptionObject({
          status: "canceled",
          ended_at: toUnixSeconds(rig.now()),
        }),
      });

      // act
      const response = await rig.requestAs(ANA_SESSION, CLIENT_PORTAL);

      // assert
      expect(response.headers.get("location")).toBe(suite.path(ENDED_PAGE));
    });
  });

  describe("writing once her coaching has ended", () => {
    it.each([
      [
        "save her onboarding draft",
        "/api/client-onboarding/draft",
        jsonWrite("PUT", {
          formId: "goal-availability",
          answers: regularSubmission().answers,
          currentFormIndex: 0,
          consents: regularSubmission().consents,
        }),
      ],
      [
        "submit her onboarding",
        "/api/client-onboarding/submission",
        formWrite({ submission: JSON.stringify(regularSubmission()) }),
      ],
      [
        "answer her coach's questions",
        "/api/client-onboarding/detail-answers",
        jsonWrite("POST", { answers: { "goal-availability": { weight: 64 } } }),
      ],
      [
        "record her measurements and photos",
        "/api/client-profile/measurements",
        formWrite({ entry: JSON.stringify({ weightKg: 64.2, waistCm: 71.5 }) }),
      ],
      [
        "save her unit preference",
        "/api/client-profile/unit-preference",
        jsonWrite("PUT", { weightUnit: "kg", heightUnit: "cm" }),
      ],
    ])("refuses to %s", async (_write, target, init) => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_13);
      await cancel(ANA_SESSION);

      // act
      const response = await rig.requestAs(ANA_SESSION, target, init());

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "ended" });
    });

    it("sends her to the ended page when she asks to manage her payment method", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_13);
      await cancel(ANA_SESSION);

      // act
      const response = await openPaymentMethod(ANA_SESSION);

      // assert
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(suite.path(ENDED_PAGE));
    });
  });

  describe("starting now", () => {
    it("turns her waiting path into an immediate start, after which a cancellation refunds nothing", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_13);

      // act
      const started = await startNow(ANA_SESSION);
      const cancelled = await cancel(ANA_SESSION);

      // assert
      expect(started.status).toBe(200);
      expect(await started.json()).toEqual({ status: "started" });
      expect(await cancelled.json()).toMatchObject({
        rule: "no-refund",
        accessEndsAt: PAID_THROUGH.toISOString(),
        refundDue: false,
      });
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        startChoice: "immediate",
      });
    });

    it("starts her program now and lifts the renewal hold her waiting purchase set", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_13);

      // act
      const started = await startNow(ANA_SESSION);

      // assert
      const updates = await lifecycle.providerSubscriptionRequests("POST");

      expect(started.status).toBe(200);
      expect(updates).toHaveLength(2);
      expect(updates[0]?.get("pause_collection[behavior]")).toBe("void");
      expect(updates[1]?.get("pause_collection")).toBe("");
      expect(await lifecycle.subscriptionPeriod()).toEqual([
        { paidThrough: PAID_THROUGH, programStartsAt: DAY_13 },
      ]);
    });

    it("refuses once the withdrawal window has closed", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_14);

      // act
      const response = await startNow(ANA_SESSION);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "outside-window" });
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        startChoice: "waiting",
      });
    });
  });

  describe("managing the payment method", () => {
    it("sends her to Stripe's payment-method page of the pinned portal configuration for her own customer, returning to her settings", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);

      // act
      const response = await openPaymentMethod(ANA_SESSION);

      // assert
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(STRIPE_BILLING_PORTAL_URL);
      const [session] = await portalSessionRequests();
      expect(session?.get("configuration")).toBe(
        STRIPE_PORTAL_CONFIGURATION_ID,
      );
      expect(session?.get("customer")).toBe(STRIPE_CUSTOMER_ID);
      expect(session?.get("return_url")).toBe(SETTINGS_RETURN_URL);
      expect(session?.get("flow_data[type]")).toBe("payment_method_update");
      expect(
        session?.get("flow_data[after_completion][redirect][return_url]"),
      ).toBe(SETTINGS_RETURN_URL);
    });

    it("sends her back to her settings when Stripe refuses", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await suite.wireMock.stub(stripeRefusesBillingPortalSessions());

      // act
      const response = await openPaymentMethod(ANA_SESSION);

      // assert
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        suite.path("/client/settings?paymentMethod=unavailable"),
      );
    });

    it("refuses the coach", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);

      // act
      const response = await openPaymentMethod(COACH_SESSION);

      // assert
      expect(response.status).toBe(403);
      expect(await portalSessionRequests()).toEqual([]);
    });

    it("refuses an anonymous request with 401", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);

      // act
      const response = await suite.request(
        new Request(suite.url(PAYMENT_METHOD_API), {
          method: "POST",
          redirect: "manual",
        }),
      );

      // assert
      expect(response.status).toBe(401);
      expect(await portalSessionRequests()).toEqual([]);
    });
  });

  describe("cancelling while Stripe reports changes", () => {
    it("keeps her cancellation when Stripe echoes the scheduled end and later deletes the subscription", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_14);
      await cancel(ANA_SESSION);

      // act
      await lifecycle.deliverEvent({
        id: "evt_subscription_echo",
        type: "customer.subscription.updated",
        object: stripeSubscriptionObject({
          cancel_at: toUnixSeconds(PAID_THROUGH),
        }),
        previousAttributes: { cancel_at: null },
      });
      const echoed = await lifecycle.subscriptionRow();
      const echoedStanding = await clients.standingOf(ANA.email);
      await rig.holdClock(PAID_THROUGH);
      await lifecycle.deliverEvent({
        id: "evt_subscription_deleted",
        type: "customer.subscription.deleted",
        object: stripeSubscriptionObject({
          status: "canceled",
          ended_at: toUnixSeconds(PAID_THROUGH),
        }),
      });

      // assert
      expect(echoed).toMatchObject({
        status: "cancelled",
        cancelledAt: DAY_14,
        accessEndsAt: PAID_THROUGH,
      });
      expect(echoedStanding).toEqual({
        ...PURCHASED_STANDING,
        coachingStatus: "cancelled",
        coachingAccessEndsAt: PAID_THROUGH,
      });
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        status: "ended",
        cancelledAt: DAY_14,
        accessEndsAt: PAID_THROUGH,
        refundReason: null,
      });
      expect(await clients.standingOf(ANA.email)).toEqual({
        ...PURCHASED_STANDING,
        coachingStatus: "ended",
        coachingAccessEndsAt: PAID_THROUGH,
      });
    });

    it("keeps a payment problem Stripe reported when she cancels afterwards", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_14);
      await lifecycle.deliverEvent({
        id: "evt_subscription_failed",
        type: "invoice.payment_failed",
        object: stripeInvoiceObject("subscription_cycle"),
      });

      // act
      await cancel(ANA_SESSION);

      // assert
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        status: "cancelled",
        paymentProblemSince: DAY_14,
      });
    });

    it("settles the refund she is owed as Stripe reports it, part then all", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_13);
      await cancel(ANA_SESSION);
      const fullyRefundedAt = new Date(DAY_13.getTime() + DAY_IN_MILLISECONDS);

      // act
      await lifecycle.deliverEvent({
        id: "evt_subscription_part_refunded",
        type: "charge.refunded",
        object: stripeRefundedChargeObject(10000),
      });
      const partRefunded = await lifecycle.subscriptionRow();
      const partRefundedStanding = await clients.standingOf(ANA.email);
      await rig.holdClock(fullyRefundedAt);
      await lifecycle.deliverEvent({
        id: "evt_subscription_refunded",
        type: "charge.refunded",
        object: stripeRefundedChargeObject(44700),
      });

      // assert
      expect(partRefunded).toMatchObject({
        refundDueCents: 44700,
        refundedCents: 10000,
        refundedAt: null,
      });
      expect(partRefundedStanding).toMatchObject({ coachingRefundDue: true });
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        refundDueCents: 44700,
        refundedCents: 44700,
        refundedAt: fullyRefundedAt,
      });
      expect(await clients.standingOf(ANA.email)).toMatchObject({
        coachingStatus: "ended",
        coachingRefundDue: false,
      });
    });

    it("settles a refund on the subscription that owns the refunded payment, not on the customer's latest", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await onboarding.admit(MARIA, MARIA_SESSION, {
        ...SECOND_PURCHASE,
        startChoice: "waiting",
      });
      await rig.holdClock(DAY_13);
      await cancel(ANA_SESSION);
      await cancel(MARIA_SESSION);

      // act
      const response = await lifecycle.deliverEvent({
        id: "evt_subscription_first_refunded",
        type: "charge.refunded",
        object: stripeRefundedChargeObject(
          44700,
          paymentIntentOf(WAITING_PURCHASE.checkout.sessionId),
        ),
      });

      // assert
      expect(response.status).toBe(200);
      expect(await lifecycle.subscriptionRow()).toMatchObject({
        refundDueCents: 44700,
        refundedCents: 44700,
        refundedAt: DAY_13,
      });
      expect(
        await lifecycle.subscriptionRow(SECOND_PURCHASE.subscriptionId),
      ).toMatchObject({ refundedCents: 0, refundedAt: null });
      expect(await clients.standingOf(ANA.email)).toMatchObject({
        coachingRefundDue: false,
      });
      expect(await clients.standingOf(MARIA.email)).toMatchObject({
        coachingRefundDue: true,
      });
    });

    it("acknowledges a refund of another payment of the same customer and leaves her subscription alone", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_13);
      await cancel(ANA_SESSION);
      const cancelled = await lifecycle.subscriptionRow();

      // act
      const response = await lifecycle.deliverEvent({
        id: "evt_subscription_other_charge_refunded",
        type: "charge.refunded",
        object: stripeRefundedChargeObject(44700, "pi_of_another_charge"),
      });

      // assert
      expect(response.status).toBe(200);
      expect(await lifecycle.subscriptionRow()).toEqual(cancelled);
      expect(await lifecycle.recordedEventIds()).not.toContain(
        "evt_subscription_other_charge_refunded",
      );
    });
  });

  describe("her check-ins once her coaching end is set", () => {
    it("cancels her check-ins at and after the paid-through end when she cancels without a refund, freeing their hours and keeping the earlier one", async () => {
      // arrange
      const { clientId, before, onEndDay, after } =
        await anaWithCheckInsAroundPaidThrough();

      // act
      await cancel(ANA_SESSION);

      // assert
      expect(await checkInStatusesOf(clientId)).toEqual([
        { id: before, status: "pending" },
        { id: onEndDay, status: "cancelled" },
        { id: after, status: "cancelled" },
      ]);
      expect(
        (await checkIns.heldCheckInHours()).map(({ checkInId }) => checkInId),
      ).toEqual([before]);
    });

    it("sends no check-in email for the check-ins her cancellation cancels", async () => {
      // arrange
      await anaWithCheckInsAroundPaidThrough();
      const sentBefore = await checkInEmailKeys();

      // act
      await cancel(ANA_SESSION);

      // assert
      expect(await checkInEmailKeys()).toEqual(sentBefore);
    });

    it("cancels every check-in still to come when she cancels with a full refund", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION, WAITING_PURCHASE);
      await rig.holdClock(DAY_13);
      await onboarding.submit(ANA_SESSION);
      const clientId = await onboarding.clientIdOf(ANA_SESSION);
      await checkIns.scheduled({ clientId, startsAt: CHECK_IN_AFTER_DAY_13 });
      await checkIns.scheduled({
        clientId,
        startsAt: LATER_CHECK_IN_AFTER_DAY_13,
      });

      // act
      await cancel(ANA_SESSION);

      // assert
      expect(
        (await checkInStatusesOf(clientId)).map(({ status }) => status),
      ).toEqual(["cancelled", "cancelled"]);
      expect(await checkIns.heldCheckInHours()).toEqual([]);
    });

    it("cancels her check-ins at and after the end Stripe scheduled", async () => {
      // arrange
      const { clientId, before, onEndDay, after } =
        await anaWithCheckInsAroundPaidThrough();

      // act
      await scheduleEndInStripe("evt_check_ins_end_scheduled");

      // assert
      expect(await checkInStatusesOf(clientId)).toEqual([
        { id: before, status: "pending" },
        { id: onEndDay, status: "cancelled" },
        { id: after, status: "cancelled" },
      ]);
      expect(
        (await checkIns.heldCheckInHours()).map(({ checkInId }) => checkInId),
      ).toEqual([before]);
    });

    it("cancels every check-in still to come when Stripe deletes her subscription", async () => {
      // arrange
      const { clientId } = await anaWithCheckInsAroundPaidThrough();

      // act
      await lifecycle.deliverEvent({
        id: "evt_check_ins_subscription_deleted",
        type: "customer.subscription.deleted",
        object: stripeSubscriptionObject({
          status: "canceled",
          ended_at: toUnixSeconds(WEEK_BEFORE_PAID_THROUGH),
        }),
      });

      // assert
      expect(
        (await checkInStatusesOf(clientId)).map(({ status }) => status),
      ).toEqual(["cancelled", "cancelled", "cancelled"]);
      expect(await checkIns.heldCheckInHours()).toEqual([]);
    });

    it("leaves her check-ins cancelled when Stripe lifts the end it scheduled", async () => {
      // arrange
      const { clientId, before, onEndDay, after } =
        await anaWithCheckInsAroundPaidThrough();
      await scheduleEndInStripe("evt_check_ins_end_scheduled");

      // act
      await lifecycle.deliverEvent({
        id: "evt_check_ins_end_lifted",
        type: "customer.subscription.updated",
        object: stripeSubscriptionObject(),
        previousAttributes: { cancel_at: toUnixSeconds(PAID_THROUGH) },
      });

      // assert
      expect(await checkInStatusesOf(clientId)).toEqual([
        { id: before, status: "pending" },
        { id: onEndDay, status: "cancelled" },
        { id: after, status: "cancelled" },
      ]);
    });

    it("stops her open times before the paid-through end", async () => {
      // arrange
      await anaWithCheckInsAroundPaidThrough();
      await cancel(ANA_SESSION);

      // act
      const times = await checkIns.openTimesOf(ANA_SESSION);

      // assert
      expect(times).toContain("2027-01-20T16:00:00.000Z");
      expect(times.filter((time) => new Date(time) >= PAID_THROUGH)).toEqual(
        [],
      );
    });

    it("stops the coach's open times for her before the paid-through end", async () => {
      // arrange
      const { clientId } = await anaWithCheckInsAroundPaidThrough();
      await cancel(ANA_SESSION);

      // act
      const times = await checkIns.openTimesOfClient(clientId);

      // assert
      expect(times).toContain("2027-01-20T16:00:00.000Z");
      expect(times.filter((time) => new Date(time) >= PAID_THROUGH)).toEqual(
        [],
      );
    });
  });
});

function cancel(session: AccountSession): Promise<Response> {
  return rig.requestAs(session, CANCELLATION_API, { method: "POST" });
}

function startNow(session: AccountSession): Promise<Response> {
  return rig.requestAs(session, PROGRAM_START_API, { method: "POST" });
}

function openPaymentMethod(session: AccountSession): Promise<Response> {
  return rig.requestAs(session, PAYMENT_METHOD_API, {
    method: "POST",
    redirect: "manual",
  });
}

function jsonWrite(method: "PUT" | "POST", body: unknown): () => RequestInit {
  return () => ({
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formWrite(fields: Record<string, string>): () => RequestInit {
  return () => {
    const form = new FormData();

    for (const [name, value] of Object.entries(fields)) {
      form.set(name, value);
    }

    return { method: "POST", body: form };
  };
}

async function refundDueEmails() {
  return (await suite.sentEmails()).filter(
    (email) => email.to === COACH_EMAIL && email.subject.includes("refund due"),
  );
}

async function anaWithCheckInsAroundPaidThrough(): Promise<{
  clientId: string;
  before: string;
  onEndDay: string;
  after: string;
}> {
  await onboarding.admit(ANA, ANA_SESSION, FIRST_PURCHASE);
  await rig.holdClock(WEEK_BEFORE_PAID_THROUGH);
  await onboarding.submit(ANA_SESSION);
  const clientId = await onboarding.clientIdOf(ANA_SESSION);
  const before = await checkIns.scheduled({
    clientId,
    startsAt: CHECK_IN_BEFORE_PAID_THROUGH,
  });
  const onEndDay = await checkIns.scheduled({
    clientId,
    startsAt: CHECK_IN_ON_PAID_THROUGH_DAY,
  });
  const after = await checkIns.scheduled({
    clientId,
    startsAt: CHECK_IN_AFTER_PAID_THROUGH,
  });
  const approval = await checkIns.approve(onEndDay, ANA_SESSION);

  if (approval.status !== 200) {
    throw new Error(`Approving her check-in answered ${approval.status}.`);
  }

  return { clientId, before, onEndDay, after };
}

async function scheduleEndInStripe(eventId: string): Promise<void> {
  await lifecycle.deliverEvent({
    id: eventId,
    type: "customer.subscription.updated",
    object: stripeSubscriptionObject({
      cancel_at: toUnixSeconds(PAID_THROUGH),
    }),
    previousAttributes: { cancel_at: null },
  });
}

async function checkInStatusesOf(
  clientId: string,
): Promise<{ id: string; status: string }[]> {
  return (await checkIns.checkInRowsOf(clientId)).map(({ id, status }) => ({
    id,
    status,
  }));
}

async function checkInEmailKeys(): Promise<(string | null)[]> {
  return (await suite.sentEmails())
    .map(({ idempotencyKey }) => idempotencyKey)
    .filter((key) => key?.includes("check-in:"));
}

async function portalSessionRequests(): Promise<URLSearchParams[]> {
  const requests = await suite.wireMock.recordedRequests(
    STRIPE_BILLING_PORTAL_SESSIONS_PATH,
  );

  return requests.map((request) => new URLSearchParams(request.body));
}
