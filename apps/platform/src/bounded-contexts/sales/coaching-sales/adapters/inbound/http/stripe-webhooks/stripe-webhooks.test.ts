import { describe, expect, it, vi } from "vitest";

import {
  coachingSalesContext,
  type CoachingSalesFeature,
} from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import * as stripeWebhooksRoute from "./stripe-webhooks";

function coachingSalesArgs(
  feature: Partial<CoachingSalesFeature>,
  request?: Request,
) {
  return createRequestArgs({
    contexts: [
      contextEntry(coachingSalesContext, feature as CoachingSalesFeature),
    ],
    request,
  });
}

describe("Stripe webhook route", () => {
  it("hands a posted Stripe event to the coaching sales webhook controller", async () => {
    // arrange
    const response = new Response(null, { status: 200 });
    const handleEvent = vi.fn().mockResolvedValue(response);
    const request = new Request("https://eli.example/api/stripe/webhooks", {
      body: "{}",
      method: "POST",
    });

    // act
    const answered = await stripeWebhooksRoute.action(
      coachingSalesArgs(
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
      coachingSalesArgs({ stripeWebhookController: { handleEvent } as never }),
    );

    // assert
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(handleEvent).not.toHaveBeenCalled();
  });
});
