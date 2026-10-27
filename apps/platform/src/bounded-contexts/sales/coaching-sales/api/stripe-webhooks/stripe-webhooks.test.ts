import { describe, expect, it, vi } from "vitest";

import { coachingSalesContext } from "~/bounded-contexts/sales/coaching-sales/server/guards/coaching-sales-context.server";
import type { CoachingSalesFeature } from "~/bounded-contexts/sales/coaching-sales/server/coaching-sales-composition.server";
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
      coachingSalesArgs({ stripeWebhooks: { handleEvent } as never }, request),
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
      coachingSalesArgs({ stripeWebhooks: { handleEvent } as never }),
    );

    // assert
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(handleEvent).not.toHaveBeenCalled();
  });
});
