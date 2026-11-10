import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";

import { createPaymentProviderAdapter } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/create-payment-provider-adapter.server";
import type { PaymentsConfig } from "~/bounded-contexts/sales/shared/payments/config.server";
import { describe, expect, it } from "vitest";

import { PaymentsAdapter } from "./payments-adapter.server";
import { InMemoryPaymentCheckoutAdapter } from "./memory/in-memory-payment-checkout-adapter.server";
import { InMemoryPaymentCustomerCardsAdapter } from "./memory/in-memory-payment-customer-cards-adapter.server";
import { InMemoryPaymentSubscriptionsAdapter } from "./memory/in-memory-payment-subscriptions-adapter.server";
import { StripePaymentCheckoutAdapter } from "./stripe/stripe-payment-checkout-adapter.server";
import { StripePaymentCustomerCardsAdapter } from "./stripe/stripe-payment-customer-cards-adapter.server";
import { StripePaymentSubscriptionsAdapter } from "./stripe/stripe-payment-subscriptions-adapter.server";

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

function paymentsAdapterFor(config: PaymentsConfig): PaymentsAdapter {
  return new PaymentsAdapter({
    paymentProvider: createPaymentProviderAdapter(config),
  });
}

describe("PaymentsAdapter", () => {
  it("returns the in-memory doubles for the memory provider", () => {
    // arrange
    const config: PaymentsConfig = { PAYMENTS_PROVIDER: "memory" };

    // act
    const paymentsAdapter = paymentsAdapterFor(config);

    // assert
    expect(paymentsAdapter.paymentCheckoutPort).toBeInstanceOf(
      InMemoryPaymentCheckoutAdapter,
    );
    expect(paymentsAdapter.paymentSubscriptionsPort).toBeInstanceOf(
      InMemoryPaymentSubscriptionsAdapter,
    );
    expect(paymentsAdapter.paymentCustomerCardsPort).toBeInstanceOf(
      InMemoryPaymentCustomerCardsAdapter,
    );
  });

  it("returns the Stripe adapters for the stripe provider", () => {
    // arrange
    const config = STRIPE_CONFIG;

    // act
    const paymentsAdapter = paymentsAdapterFor(config);

    // assert
    expect(paymentsAdapter.paymentCheckoutPort).toBeInstanceOf(
      StripePaymentCheckoutAdapter,
    );
    expect(paymentsAdapter.paymentSubscriptionsPort).toBeInstanceOf(
      StripePaymentSubscriptionsAdapter,
    );
    expect(paymentsAdapter.paymentCustomerCardsPort).toBeInstanceOf(
      StripePaymentCustomerCardsAdapter,
    );
  });

  it("sends Stripe API calls to the configured base URL", async () => {
    // arrange
    const stripeApi = await startStripeApiStub();
    const { paymentCheckoutPort } = paymentsAdapterFor({
      ...STRIPE_CONFIG,
      STRIPE_API_BASE_URL: stripeApi.baseUrl,
    });

    // act
    const customer = await paymentCheckoutPort
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
