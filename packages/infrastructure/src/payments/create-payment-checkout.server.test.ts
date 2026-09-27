import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";

import type { PaymentsConfig } from "@eli-coach-platform/config";
import { describe, expect, it } from "vitest";

import { createPaymentCheckout } from "./create-payment-checkout.server";
import { InMemoryPaymentCheckout } from "./memory/in-memory-payment-checkout.server";
import { StripePaymentCheckout } from "./stripe/stripe-payment-checkout.server";

type RecordedRequest = {
  method: string | undefined;
  url: string | undefined;
  headers: IncomingHttpHeaders;
  body: string;
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

describe("createPaymentCheckout", () => {
  it("returns the in-memory double for the memory provider", () => {
    // arrange
    const config: PaymentsConfig = { PAYMENTS_PROVIDER: "memory" };

    // act
    const checkout = createPaymentCheckout(config);

    // assert
    expect(checkout).toBeInstanceOf(InMemoryPaymentCheckout);
  });

  it("returns the Stripe adapter for the stripe provider", () => {
    // arrange
    const config: PaymentsConfig = {
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_unit",
      STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_unit",
    };

    // act
    const checkout = createPaymentCheckout(config);

    // assert
    expect(checkout).toBeInstanceOf(StripePaymentCheckout);
  });

  it("refuses the stripe provider without a secret key", () => {
    // arrange
    const config: PaymentsConfig = {
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_unit",
    };

    // act
    const create = () => createPaymentCheckout(config);

    // assert
    expect(create).toThrow("STRIPE_SECRET_KEY");
  });

  it("sends Stripe API calls to the configured base URL", async () => {
    // arrange
    const stripeApi = await startStripeApiStub();
    const checkout = createPaymentCheckout({
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_unit",
      STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_unit",
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
