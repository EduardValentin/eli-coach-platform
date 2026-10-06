import type { WireMockStub } from "../wire-mock-container";

export const STRIPE_CUSTOMERS_PATH = "/v1/customers";
export const STRIPE_CHECKOUT_SESSIONS_PATH = "/v1/checkout/sessions";
export const STRIPE_CUSTOMER_ID = "cus_integration";
export const STRIPE_CHECKOUT_SESSION_ID = "cs_test_integration";
export const STRIPE_SUBSCRIPTION_ID = "sub_integration";
export const STRIPE_SUBSCRIPTIONS_PATH = "/v1/subscriptions";
export const STRIPE_BILLING_PORTAL_SESSIONS_PATH =
  "/v1/billing_portal/sessions";
export const STRIPE_PORTAL_CONFIGURATION_ID = "bpc_integration";
export const STRIPE_BILLING_PORTAL_URL =
  "https://billing.stripe.com/p/session/test_integration";
export const STRIPE_PAYMENT_METHODS_PATH = "/v1/payment_methods";
export const STRIPE_PAYMENT_METHOD_ID = "pm_integration";
export const STRIPE_CARD = {
  brand: "visa",
  last4: "4242",
  exp_month: 12,
  exp_year: 2034,
} as const;

const HOSTED_CHECKOUT_BASE_URL = "https://checkout.stripe.com/c/pay/";
const jsonHeaders = { "Content-Type": "application/json" };
const coachingSubscriptionMetadata = { purpose: "coaching-subscription" };

export type StripeCheckoutSession = {
  amount_total: number;
  created: number;
  currency: "eur";
  customer: string;
  customer_details: { email: string };
  id: string;
  invoice: string | null;
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

export function paymentIntentOf(sessionId: string): string {
  return `pi_of_${sessionId}`;
}

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
      metadata: coachingSubscriptionMetadata,
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
      jsonBody: {
        ...session,
        invoice: expandedInvoice(session),
        payment_intent: null,
        subscription: expandedSubscription(session),
      },
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
        metadata: coachingSubscriptionMetadata,
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
    invoice: `in_of_${content.id}`,
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
    invoice: null,
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
  "invoice" | "payment_status" | "status" | "subscription" | "url"
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

function expandedInvoice(session: StripeCheckoutSession) {
  if (!session.invoice) {
    return null;
  }

  return {
    id: session.invoice,
    object: "invoice",
    payments: {
      data: [
        {
          object: "invoice_payment",
          payment: {
            payment_intent: paymentIntentOf(session.id),
            type: "payment_intent",
          },
          status: "paid",
        },
      ],
      object: "list",
    },
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

export function stripeSubscriptionPath(subscriptionId: string): string {
  return `${STRIPE_SUBSCRIPTIONS_PATH}/${subscriptionId}`;
}

const SUBSCRIPTION_BY_ID_PATTERN = `${STRIPE_SUBSCRIPTIONS_PATH}/[^/]+`;

const stripeUpdatesSubscription: WireMockStub = {
  request: { method: "POST", urlPathPattern: SUBSCRIPTION_BY_ID_PATTERN },
  response: subscriptionResponse("active"),
};

const stripeCancelsSubscription: WireMockStub = {
  request: { method: "DELETE", urlPathPattern: SUBSCRIPTION_BY_ID_PATTERN },
  response: subscriptionResponse("canceled"),
};

const stripeCreatesBillingPortalSession: WireMockStub = {
  request: { method: "POST", urlPath: STRIPE_BILLING_PORTAL_SESSIONS_PATH },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      customer: STRIPE_CUSTOMER_ID,
      id: "bps_integration",
      object: "billing_portal.session",
      url: STRIPE_BILLING_PORTAL_URL,
    },
  },
};

const stripeApiFailure: WireMockStub["response"] = {
  headers: jsonHeaders,
  status: 400,
  jsonBody: {
    error: {
      message: "The payment provider refused the request.",
      type: "invalid_request_error",
    },
  },
};

export function stripeRefusesSubscriptionUpdates(): WireMockStub {
  return {
    priority: 2,
    request: { method: "POST", urlPathPattern: SUBSCRIPTION_BY_ID_PATTERN },
    response: stripeApiFailure,
  };
}

export function stripeAcceptsSubscriptionUpdatesAgain(): WireMockStub {
  return { ...stripeUpdatesSubscription, priority: 1 };
}

export function stripeRefusesSubscriptionCancellation(): WireMockStub {
  return {
    priority: 2,
    request: { method: "DELETE", urlPathPattern: SUBSCRIPTION_BY_ID_PATTERN },
    response: stripeApiFailure,
  };
}

export function stripeRefusesBillingPortalSessions(): WireMockStub {
  return {
    priority: 2,
    request: { method: "POST", urlPath: STRIPE_BILLING_PORTAL_SESSIONS_PATH },
    response: stripeApiFailure,
  };
}

const CUSTOMER_BY_ID_PATTERN = `${STRIPE_CUSTOMERS_PATH}/[^/]+`;

export function stripeCustomerPath(customerId: string): string {
  return `${STRIPE_CUSTOMERS_PATH}/${customerId}`;
}

export function stripePaymentMethodPath(paymentMethodId: string): string {
  return `${STRIPE_PAYMENT_METHODS_PATH}/${paymentMethodId}`;
}

const stripeRetrievesCustomer: WireMockStub = {
  request: { method: "GET", urlPathPattern: CUSTOMER_BY_ID_PATTERN },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      id: STRIPE_CUSTOMER_ID,
      invoice_settings: { default_payment_method: null },
      object: "customer",
      subscriptions: {
        data: [
          {
            default_payment_method: STRIPE_PAYMENT_METHOD_ID,
            id: STRIPE_SUBSCRIPTION_ID,
            object: "subscription",
          },
        ],
        object: "list",
      },
    },
  },
};

const stripeRetrievesPaymentMethod: WireMockStub = {
  request: {
    method: "GET",
    urlPathPattern: `${STRIPE_PAYMENT_METHODS_PATH}/[^/]+`,
  },
  response: {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      card: STRIPE_CARD,
      customer: STRIPE_CUSTOMER_ID,
      id: STRIPE_PAYMENT_METHOD_ID,
      object: "payment_method",
      type: "card",
    },
  },
};

export function stripeRefusesCustomerReads(): WireMockStub {
  return {
    priority: 2,
    request: { method: "GET", urlPathPattern: CUSTOMER_BY_ID_PATTERN },
    response: stripeApiFailure,
  };
}

export function stripeAcceptsCustomerReadsAgain(): WireMockStub {
  return { ...stripeRetrievesCustomer, priority: 1 };
}

function subscriptionResponse(status: string): WireMockStub["response"] {
  return {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      customer: STRIPE_CUSTOMER_ID,
      id: STRIPE_SUBSCRIPTION_ID,
      metadata: coachingSubscriptionMetadata,
      object: "subscription",
      status,
    },
  };
}

function openSessionResponse(sessionId: string): WireMockStub["response"] {
  return {
    headers: jsonHeaders,
    status: 200,
    jsonBody: {
      customer: STRIPE_CUSTOMER_ID,
      id: sessionId,
      metadata: coachingSubscriptionMetadata,
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
  stripeUpdatesSubscription,
  stripeCancelsSubscription,
  stripeCreatesBillingPortalSession,
  stripeRetrievesCustomer,
  stripeRetrievesPaymentMethod,
];
