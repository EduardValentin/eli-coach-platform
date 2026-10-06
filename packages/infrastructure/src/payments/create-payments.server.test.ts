import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";

import type { PaymentsConfig } from "@eli-coach-platform/config";
import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { createPayments } from "./create-payments.server";
import { InMemoryPaymentCheckout } from "./memory/in-memory-payment-checkout.server";
import { InMemoryPaymentCustomerCards } from "./memory/in-memory-payment-customer-cards.server";
import { InMemoryPaymentEvents } from "./memory/in-memory-payment-events.server";
import { InMemoryPaymentSubscriptions } from "./memory/in-memory-payment-subscriptions.server";
import { StripePaymentCheckout } from "./stripe/stripe-payment-checkout.server";
import { StripePaymentCustomerCards } from "./stripe/stripe-payment-customer-cards.server";
import { StripePaymentEvents } from "./stripe/stripe-payment-events.server";
import { StripePaymentSubscriptions } from "./stripe/stripe-payment-subscriptions.server";

type RecordedRequest = {
  method: string | undefined;
  url: string | undefined;
  headers: IncomingHttpHeaders;
  body: string;
};

const STRIPE_CONFIG: PaymentsConfig = {
  PAYMENTS_PROVIDER: "stripe",
  STRIPE_SECRET_KEY: "sk_test_unit",
  STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_unit",
};

async function startStripeApiStub() {
  const requests: RecordedRequest[] = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    request.on("end", () => {
      requests.push({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body,
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ id: "cus_stub", object: "customer" }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    requests,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe("createPayments", () => {
  it("returns the in-memory doubles for the memory provider", () => {
    // arrange
    const config: PaymentsConfig = { PAYMENTS_PROVIDER: "memory" };

    // act
    const payments = createPayments(config);

    // assert
    expect(payments.checkout).toBeInstanceOf(InMemoryPaymentCheckout);
    expect(payments.events).toBeInstanceOf(InMemoryPaymentEvents);
    expect(payments.subscriptions).toBeInstanceOf(InMemoryPaymentSubscriptions);
    expect(payments.customerCards).toBeInstanceOf(InMemoryPaymentCustomerCards);
  });

  it("returns the Stripe adapters for the stripe provider", () => {
    // arrange
    const config = STRIPE_CONFIG;

    // act
    const payments = createPayments(config);

    // assert
    expect(payments.checkout).toBeInstanceOf(StripePaymentCheckout);
    expect(payments.events).toBeInstanceOf(StripePaymentEvents);
    expect(payments.subscriptions).toBeInstanceOf(StripePaymentSubscriptions);
    expect(payments.customerCards).toBeInstanceOf(StripePaymentCustomerCards);
  });

  it("refuses the stripe provider without a secret key", () => {
    // arrange
    const config: PaymentsConfig = {
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_unit",
    };

    // act
    const create = () => createPayments(config);

    // assert
    expect(create).toThrow("STRIPE_SECRET_KEY");
  });

  it("refuses the stripe provider without a webhook signing secret", () => {
    // arrange
    const config: PaymentsConfig = {
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_unit",
    };

    // act
    const create = () => createPayments(config);

    // assert
    expect(create).toThrow("STRIPE_WEBHOOK_SIGNING_SECRET");
  });

  it("verifies Stripe signatures with the configured signing secret", async () => {
    // arrange
    const { events } = createPayments(STRIPE_CONFIG);
    const rawBody = JSON.stringify({
      id: "evt_unit",
      type: "customer.created",
      created: 1790003600,
      data: { object: {} },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: rawBody,
      secret: "whsec_unit",
    });

    // act
    const verdict = await events.verify(rawBody, signature);

    // assert
    expect(verdict).toEqual({ kind: "ignored" });
  });

  it("refuses an event signed with another secret", async () => {
    // arrange
    const { events } = createPayments(STRIPE_CONFIG);
    const rawBody = JSON.stringify({
      id: "evt_unit",
      type: "customer.created",
      created: 1790003600,
      data: { object: {} },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: rawBody,
      secret: "whsec_another_account",
    });

    // act
    const verdict = await events.verify(rawBody, signature);

    // assert
    expect(verdict).toEqual({ kind: "invalid" });
  });

  it("sends Stripe API calls to the configured base URL", async () => {
    // arrange
    const stripeApi = await startStripeApiStub();
    const { checkout } = createPayments({
      ...STRIPE_CONFIG,
      STRIPE_API_BASE_URL: stripeApi.baseUrl,
    });

    // act
    const customer = await checkout
      .createCustomer({
        email: "sofia@example.com",
        assessmentCallId: "call-1",
      })
      .finally(stripeApi.stop);

    // assert
    expect(customer).toEqual({ id: "cus_stub" });
    expect(stripeApi.requests).toHaveLength(1);
    const [request] = stripeApi.requests;
    expect(request.method).toBe("POST");
    expect(request.url).toBe("/v1/customers");
    expect(request.headers["idempotency-key"]).toBe(
      "assessment-call:call-1:customer",
    );
    expect(new URLSearchParams(request.body).get("email")).toBe(
      "sofia@example.com",
    );
    expect(
      new URLSearchParams(request.body).get("metadata[assessmentCallId]"),
    ).toBe("call-1");
  });
});
