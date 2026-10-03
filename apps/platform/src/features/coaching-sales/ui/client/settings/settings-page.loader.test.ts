import { describe, expect, it, vi } from "vitest";

import type { ClientSettings } from "~/features/coaching-sales/contracts/client-subscription";
import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, meta } from "./settings-page";

const SETTINGS: ClientSettings = {
  subscription: {
    bundleId: "3-months",
    months: 3,
    amountCents: 44_700,
    currency: "eur",
    paidAt: "2026-09-28T09:00:00.000Z",
    status: "not-started",
    cancelledAt: null,
    accessEndsAt: null,
    paymentProblem: false,
  },
  cancellation: null,
  startNowUntil: null,
};

describe("settings page route", () => {
  it("loads her subscription settings from coaching sales", async () => {
    // arrange
    const subscription = { loadSettings: vi.fn().mockResolvedValue(SETTINGS) };
    const args = createRequestArgs({
      contexts: [
        contextEntry(coachingSalesContext, {
          subscription,
        } as unknown as CoachingSalesFeature),
      ],
      request: new Request("https://evoa.fit/client/settings"),
    });

    // act
    const settings = await loader(args);

    // assert
    expect(settings).toBe(SETTINGS);
    expect(subscription.loadSettings).toHaveBeenCalledWith(args);
  });

  it("titles the page as the client portal's settings", () => {
    // arrange
    const describePage = meta;

    // act
    const tags = describePage({} as Parameters<typeof meta>[0]);

    // assert
    expect(tags).toEqual(
      expect.arrayContaining([{ title: "Settings | Evoa" }]),
    );
  });
});
