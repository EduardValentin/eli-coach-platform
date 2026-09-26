import type { WireMockStub } from "../wire-mock-container";

export const STRIPE_CUSTOMERS_PATH = "/v1/customers";
export const STRIPE_CHECKOUT_SESSIONS_PATH = "/v1/checkout/sessions";
export const STRIPE_CUSTOMER_ID = "cus_integration";
export const STRIPE_CHECKOUT_SESSION_ID = "cs_test_integration";
export const STRIPE_SUBSCRIPTION_ID = "sub_integration";

const HOSTED_CHECKOUT_BASE_URL = "https://checkout.stripe.com/c/pay/";
const jsonHeaders = { "Content-Type": "application/json" };

export type StripeCheckoutSession = {
  amount_total: number;
  created: number;
  currency: "eur";
  customer: string;
  customer_details: { email: string };
  id: string;
  metadata: Record<string, string>;
  mode: "subscription";
  object: "checkout.session";
  payment_status: "paid" | "unpaid";
  status: "complete" | "open";
  subscription: string | null;
  url: string | null;
};

export type CheckoutSessionContent = {
  amountTotal: number;
  createdAt: Date;
  customerEmail: string;
  id: string;
  metadata: Record<string, string>;
};

export function hostedCheckoutUrl(sessionId: string): string {
  return `${HOSTED_CHECKOUT_BASE_URL}${sessionId}`;
}

export function toUnixSeconds(instant: Date): number {
  return Math.floor(instant.getTime() / 1000);
}

export function stripeCheckoutSessionExpirePath(sessionId: string): string {
  return `${STRIPE_CHECKOUT_SESSIONS_PATH}/${sessionId}/expire`;
}

const stripeCreatesCustomer: WireMockStub = {
  request: { method: "POST", urlPath: STRIPE_CUSTOMERS_PATH },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      created: 1_790_000_000,
      id: STRIPE_CUSTOMER_ID,
      livemode: false,
      object: "customer",
    },
  },
};

const stripeCreatesCheckoutSession: WireMockStub = {
  priority: 10,
  request: { method: "POST", urlPath: STRIPE_CHECKOUT_SESSIONS_PATH },
  response: openSessionResponse(STRIPE_CHECKOUT_SESSION_ID),
};

// The caller discards the expired session Stripe answers with, so the body
// stands only for the shape; which session was expired is read from
// WireMock's request journal.
const stripeExpiresSession: WireMockStub = {
  request: {
    method: "POST",
    urlPathPattern: `${STRIPE_CHECKOUT_SESSIONS_PATH}/[^/]+/expire`,
  },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      id: STRIPE_CHECKOUT_SESSION_ID,
      mode: "subscription",
      object: "checkout.session",
      payment_status: "unpaid",
      status: "expired",
      url: null,
    },
  },
};

export function stripeCreatesCheckoutSessionForBundle(
  bundleId: string,
  sessionId: string,
): WireMockStub {
  return {
    priority: 1,
    request: {
      formParameters: { "metadata[bundleId]": { equalTo: bundleId } },
      method: "POST",
      urlPath: STRIPE_CHECKOUT_SESSIONS_PATH,
    },
    response: openSessionResponse(sessionId),
  };
}

export function stripeRetrievesSession(
  session: StripeCheckoutSession,
): WireMockStub {
  return {
    request: {
      method: "GET",
      urlPath: `${STRIPE_CHECKOUT_SESSIONS_PATH}/${session.id}`,
    },
    response: {
      headers: jsonHeaders,
      status: 200,
      jsonBody: { ...session, subscription: expandedSubscription(session) },
    },
  };
}

export function stripeRetrievesExpiredSession(sessionId: string): WireMockStub {
  return {
    request: {
      method: "GET",
      urlPath: `${STRIPE_CHECKOUT_SESSIONS_PATH}/${sessionId}`,
    },
    response: {
      headers: jsonHeaders,
      status: 200,
      jsonBody: {
        customer: STRIPE_CUSTOMER_ID,
        id: sessionId,
        mode: "subscription",
        object: "checkout.session",
        payment_status: "unpaid",
        status: "expired",
        subscription: null,
        url: null,
      },
    },
  };
}

export function completedCheckoutSession(
  content: CheckoutSessionContent,
): StripeCheckoutSession {
  return {
    ...checkoutSession(content),
    payment_status: "paid",
    status: "complete",
    subscription: STRIPE_SUBSCRIPTION_ID,
    url: null,
  };
}

export function openCheckoutSession(
  content: CheckoutSessionContent,
): StripeCheckoutSession {
  return {
    ...checkoutSession(content),
    payment_status: "unpaid",
    status: "open",
    subscription: null,
    url: hostedCheckoutUrl(content.id),
  };
}

function checkoutSession(
  content: CheckoutSessionContent,
): Omit<
  StripeCheckoutSession,
  "payment_status" | "status" | "subscription" | "url"
> {
  return {
    amount_total: content.amountTotal,
    created: toUnixSeconds(content.createdAt),
    currency: "eur",
    customer: STRIPE_CUSTOMER_ID,
    customer_details: { email: content.customerEmail },
    id: content.id,
    metadata: content.metadata,
    mode: "subscription",
    object: "checkout.session",
  };
}

function expandedSubscription(session: StripeCheckoutSession) {
  if (!session.subscription) {
    return null;
  }

  return {
    created: session.created,
    id: session.subscription,
    object: "subscription",
    status: "active",
  };
}

function openSessionResponse(sessionId: string): WireMockStub["response"] {
  return {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      customer: STRIPE_CUSTOMER_ID,
      id: sessionId,
      mode: "subscription",
      object: "checkout.session",
      payment_status: "unpaid",
      status: "open",
      url: hostedCheckoutUrl(sessionId),
    },
  };
}

export const stripeApiStubs: readonly WireMockStub[] = [
  stripeCreatesCustomer,
  stripeCreatesCheckoutSession,
  stripeExpiresSession,
];
