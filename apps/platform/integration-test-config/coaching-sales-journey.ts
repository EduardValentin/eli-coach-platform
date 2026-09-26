import {
  ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION,
  WAITLIST_TURNSTILE_ACTION,
} from "@eli-coach-platform/infrastructure/bot-detection";
import { z } from "zod";

import {
  COACH_SESSION,
  type AccountSession,
  type PlatformRig,
} from "./platform-rig";
import { stripeWebhook } from "./stripe-webhook-request";
import {
  STRIPE_CHECKOUT_SESSION_ID,
  STRIPE_CHECKOUT_SESSIONS_PATH,
  completedCheckoutSession,
  type StripeCheckoutSession,
} from "./wire-mock/expectations/stripe-api";
import { turnstileTokenForAction } from "./wire-mock/expectations/turnstile-siteverify";

export type Visitor = { email: string; firstName: string; lastName: string };

export type CheckoutChoice = {
  bundleId?: string;
  startChoice?: string;
  token: string;
};

export type SentPaymentLink = { callId: string; token: string };

export type RequestedCheckout = { requestIndex: number; sessionId: string };

export const ANA: Visitor = {
  email: "ana@example.com",
  firstName: "Ana",
  lastName: "Popescu",
};

export const BOOKING_INSTANT = new Date("2026-10-19T08:00:00.000Z");
export const CALL_ENDED_INSTANT = new Date("2026-10-21T08:00:00.000Z");
export const FIRST_CHECKOUT_REQUEST = 0;
export const SECOND_CHECKOUT_REQUEST = 1;
export const PAYMENT_LINKS_API = "/api/coaching-sales/payment-links";
export const CHECKOUTS_API = "/api/coaching-sales/checkouts";
export const STRIPE_WEBHOOKS_API = "/api/stripe/webhooks";
export const PAYMENT_LINK_EMAIL_SUBJECTS = {
  reduced: "Your reduced prices are ready.",
  regular: "Your coaching bundles — pick the one that fits.",
} as const;

const SELECT_BUNDLE_LINK = /https?:\/\/[^\s"<]+\/select-bundle\?token=([\w-]+)/;
const VISITOR_TIME_ZONE = "Europe/London";

const openSlotsSchema = z.object({ slots: z.array(z.string()).min(1) });
const bookedCallSchema = z.object({ booking: z.object({ id: z.uuid() }) });

/**
 * The steps of a coaching sale, each driven through the entry point a
 * visitor, the coach portal or Stripe reaches.
 */
export class CoachingSalesJourney {
  private buyer: Visitor = ANA;

  constructor(private readonly rig: PlatformRig) {}

  async joinWaitlist(email: string): Promise<void> {
    const response = await this.rig.suite.request(
      new Request(this.rig.suite.url("/api/waitlist"), {
        body: new URLSearchParams({
          "cf-turnstile-response": turnstileTokenForAction(
            WAITLIST_TURNSTILE_ACTION,
          ),
          email,
        }),
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
      }),
    );

    if (response.status !== 201) {
      throw new Error(`Joining the waitlist answered ${response.status}.`);
    }
  }

  async bookCall(visitor: Visitor = ANA): Promise<string> {
    await this.rig.holdClock(BOOKING_INSTANT);
    const [startsAt] = await this.openSlots();
    const response = await this.rig.suite.request(
      new Request(this.rig.suite.url("/api/assessment-calls"), {
        body: bookingForm(visitor, startsAt),
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
      }),
    );

    if (response.status !== 201) {
      throw new Error(`Booking the call answered ${response.status}.`);
    }

    this.buyer = visitor;

    return bookedCallSchema.parse(await response.json()).booking.id;
  }

  async bookEndedCall(visitor: Visitor = ANA): Promise<string> {
    const callId = await this.bookCall(visitor);
    await this.rig.holdClock(CALL_ENDED_INSTANT);

    return callId;
  }

  async sendPaymentLink(callId: string): Promise<Response> {
    return this.sendPaymentLinkAs(COACH_SESSION, callId);
  }

  async sendPaymentLinkAs(
    session: AccountSession,
    callId: string,
  ): Promise<Response> {
    return this.rig.requestAs(session, PAYMENT_LINKS_API, {
      body: JSON.stringify({ assessmentCallId: callId }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  }

  async sendPaymentLinkAfterEndedCall(
    visitor: Visitor = ANA,
  ): Promise<SentPaymentLink> {
    const callId = await this.bookEndedCall(visitor);
    const response = await this.sendPaymentLink(callId);

    if (response.status !== 200) {
      throw new Error(`Sending the payment link answered ${response.status}.`);
    }

    return { callId, token: await this.latestPaymentLinkToken() };
  }

  async paymentLinkTokens(): Promise<string[]> {
    const emails = await this.rig.suite.sentEmails();

    return emails.flatMap((email) => {
      const token = SELECT_BUNDLE_LINK.exec(email.text)?.[1];

      return token ? [token] : [];
    });
  }

  async latestPaymentLinkToken(): Promise<string> {
    const token = (await this.paymentLinkTokens()).at(-1);

    if (!token) {
      throw new Error("No payment link email has been sent.");
    }

    return token;
  }

  async startCheckout(choice: CheckoutChoice): Promise<Response> {
    const form = new URLSearchParams({ token: choice.token });

    if (choice.bundleId) {
      form.set("bundleId", choice.bundleId);
    }

    if (choice.startChoice) {
      form.set("startChoice", choice.startChoice);
    }

    return this.rig.suite.request(
      new Request(this.rig.suite.url(CHECKOUTS_API), {
        body: form,
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
        redirect: "manual",
      }),
    );
  }

  async requestedCheckoutSessions(): Promise<URLSearchParams[]> {
    const requests = await this.rig.suite.wireMock.recordedRequests(
      STRIPE_CHECKOUT_SESSIONS_PATH,
    );

    return requests.map((request) => new URLSearchParams(request.body));
  }

  async completionOfCheckoutRequest(
    checkout: RequestedCheckout,
  ): Promise<StripeCheckoutSession> {
    const requested = (await this.requestedCheckoutSessions())[
      checkout.requestIndex
    ];

    if (!requested) {
      throw new Error(
        `No checkout session request #${checkout.requestIndex} reached Stripe.`,
      );
    }

    return completedCheckoutSession({
      amountTotal: Number(
        requested.get("line_items[0][price_data][unit_amount]"),
      ),
      createdAt: this.rig.now(),
      customerEmail: this.buyer.email,
      id: checkout.sessionId,
      metadata: readMetadata(requested),
    });
  }

  async deliverCheckoutCompleted(
    session: StripeCheckoutSession,
    eventId: string,
  ): Promise<Response> {
    return this.rig.suite.request(
      stripeWebhook({
        event: {
          data: { object: session },
          id: eventId,
          type: "checkout.session.completed",
        },
        signedAt: this.rig.now(),
        url: this.rig.suite.url(STRIPE_WEBHOOKS_API),
      }),
    );
  }

  async payForCall(): Promise<SentPaymentLink> {
    const sentLink = await this.sendPaymentLinkAfterEndedCall();
    await this.startCheckout({
      bundleId: "3-months",
      startChoice: "immediate",
      token: sentLink.token,
    });
    const response = await this.deliverCheckoutCompleted(
      await this.completionOfCheckoutRequest({
        requestIndex: FIRST_CHECKOUT_REQUEST,
        sessionId: STRIPE_CHECKOUT_SESSION_ID,
      }),
      "evt_integration_paid",
    );

    if (response.status !== 200) {
      throw new Error(`The completed checkout answered ${response.status}.`);
    }

    return sentLink;
  }

  private async openSlots(): Promise<string[]> {
    const response = await this.rig.suite.request(
      new Request(this.rig.suite.url("/api/assessment-calls/slots")),
    );

    return openSlotsSchema.parse(await response.json()).slots;
  }
}

function bookingForm(visitor: Visitor, startsAt: string): URLSearchParams {
  return new URLSearchParams({
    "cf-turnstile-response": turnstileTokenForAction(
      ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION,
    ),
    country: "RO",
    dateOfBirth: "1994-03-14",
    email: visitor.email,
    firstName: visitor.firstName,
    gender: "female",
    lastName: visitor.lastName,
    phoneCountry: "RO",
    phoneNumber: "0712 345 678",
    primaryGoal: "build_strength",
    startsAt,
    visitorTimeZone: VISITOR_TIME_ZONE,
  });
}

function readMetadata(requested: URLSearchParams): Record<string, string> {
  return Object.fromEntries(
    [...requested.entries()].flatMap(([name, value]) => {
      const key = /^metadata\[(\w+)\]$/.exec(name)?.[1];

      return key ? [[key, value]] : [];
    }),
  );
}
