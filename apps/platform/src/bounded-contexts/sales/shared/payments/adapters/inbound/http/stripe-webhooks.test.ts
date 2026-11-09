import { describe, expect, it, vi } from "vitest";

import {
  paymentsContext,
  type PaymentsFeature,
} from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import * as stripeWebhooksRoute from "./stripe-webhooks";

function paymentsArgs(feature: Partial<PaymentsFeature>, request?: Request) {
  return createRequestArgs({
    contexts: [contextEntry(paymentsContext, feature as PaymentsFeature)],
    request,
  });
}

describe("Stripe webhook route", () => {
  it("hands a posted Stripe event to the webhook controller", async () => {
    // arrange
    const response = new Response(null, { status: 200 });
    const handleEvent = vi.fn().mockResolvedValue(response);
    const request = new Request("https://eli.example/api/stripe/webhooks", {
      body: "{}",
      method: "POST",
    });

    // act
    const answered = await stripeWebhooksRoute.action(
      paymentsArgs(
        { stripeWebhookController: { handleEvent } as never },
        request,
      ),
    );

    // assert
    expect(answered).toBe(response);
    expect(handleEvent).toHaveBeenCalledWith(request);
  });

  it("refuses to read Stripe webhooks", async () => {
    // arrange
    const handleEvent = vi.fn();

    // act
    const response = await stripeWebhooksRoute.loader(
      paymentsArgs({ stripeWebhookController: { handleEvent } as never }),
    );

    // assert
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(handleEvent).not.toHaveBeenCalled();
  });
});
