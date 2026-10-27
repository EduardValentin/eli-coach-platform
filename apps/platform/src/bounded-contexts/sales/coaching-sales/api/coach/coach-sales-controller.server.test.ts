import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type { CoachingSubscriptionSnapshot } from "@eli-coach-platform/domain/coaching-subscription";
import { EmailAddress } from "@eli-coach-platform/domain/email-address";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/bounded-contexts/access/accounts/server/accounts-composition.server";
import { accountsContext } from "~/bounded-contexts/access/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { CoachSalesController } from "./coach-sales-controller.server";

const CLIENT_ID = "2d3e4f50-6172-4839-9a0b-1c2d3e4f5061";

describe("CoachSalesController", () => {
  it("reads the sales state of each named call, and the client a paid one created, into a plain record", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue(
      new Map([
        ["call-1", { state: "held", clientId: null }],
        ["call-2", { state: "payment-link-sent", clientId: null }],
        ["call-3", { state: "paid", clientId: CLIENT_ID }],
      ]),
    );
    const controller = new CoachSalesController({
      readCallSalesStates: { execute } as never,
      readPricingTiers: { execute: vi.fn() } as never,
      readSubscriptionSummary: { execute: vi.fn() } as never,
    });

    // act
    const states = await controller.loadCallSales([
      "call-1",
      "call-2",
      "call-3",
    ]);

    // assert
    expect(states).toEqual({
      "call-1": { state: "held", clientId: null },
      "call-2": { state: "payment-link-sent", clientId: null },
      "call-3": { state: "paid", clientId: CLIENT_ID },
    });
    expect(execute).toHaveBeenCalledWith(["call-1", "call-2", "call-3"]);
  });

  it("reads the price tier each call's email holds, keyed by the call", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue(
      new Map([
        ["ana@example.com", "reduced"],
        ["bea@example.com", "regular"],
      ]),
    );
    const controller = new CoachSalesController({
      readCallSalesStates: { execute: vi.fn() } as never,
      readPricingTiers: { execute } as never,
      readSubscriptionSummary: { execute: vi.fn() } as never,
    });

    // act
    const tiers = await controller.loadPricingTiers([
      { email: " Ana@Example.com ", id: "call-1" },
      { email: "bea@example.com", id: "call-2" },
      { email: "ana@example.com", id: "call-3" },
    ]);

    // assert
    expect(tiers).toEqual({
      "call-1": "reduced",
      "call-2": "regular",
      "call-3": "reduced",
    });
    expect(execute).toHaveBeenCalledWith([
      EmailAddress.normalize("ana@example.com"),
      EmailAddress.normalize("bea@example.com"),
      EmailAddress.normalize("ana@example.com"),
    ]);
  });
});

const PAID_AT = new Date("2026-09-26T10:00:00.000Z");
const ENDED_AT = new Date("2026-10-15T10:00:00.000Z");

const SUBSCRIPTION: CoachingSubscriptionSnapshot = {
  id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  clientId: CLIENT_ID,
  bundleId: "3-months",
  months: 3,
  tier: "regular",
  amountCents: 44700,
  currency: "eur",
  paymentCustomerId: "cus_1",
  paymentSubscriptionId: "sub_1",
  checkoutSessionId: "cs_1",
  paidAt: PAID_AT,
  paidThrough: new Date("2026-12-26T10:00:00.000Z"),
  programStartsAt: PAID_AT,
  startChoice: "immediate",
  status: "not-started",
  cancelledAt: null,
  accessEndsAt: null,
  paymentProblemSince: null,
  refund: null,
};

const COACH: AccountSnapshot = {
  authSubjectId: "user_coach",
  id: "acct_coach",
  role: "COACH",
};

describe("CoachSalesController#loadClientSubscription", () => {
  it("reads her subscription for the coach's client record", async () => {
    // arrange
    const { controller, readSubscriptionSummary } =
      subscriptionController(summaryOf());

    // act
    const subscription = await controller.loadClientSubscription(
      coachArgs(),
      CLIENT_ID,
    );

    // assert
    expect(subscription).toEqual({
      bundleId: "3-months",
      months: 3,
      reducedPrice: false,
      paidAt: "2026-09-26T10:00:00.000Z",
      workStartsOn: null,
      status: "not-started",
      endsOn: null,
      endedOn: null,
      refund: null,
    });
    expect(readSubscriptionSummary).toHaveBeenCalledWith(CLIENT_ID);
  });

  it("reads when a cancelled subscription ends", async () => {
    // arrange
    const { controller } = subscriptionController(
      summaryOf(
        {
          status: "cancelled",
          cancelledAt: ENDED_AT,
          accessEndsAt: new Date("2026-12-26T10:00:00.000Z"),
        },
        { status: "cancelled" },
      ),
    );

    // act
    const subscription = await controller.loadClientSubscription(
      coachArgs(),
      CLIENT_ID,
    );

    // assert
    expect(subscription).toMatchObject({
      status: "cancelled",
      endsOn: "2026-12-26T10:00:00.000Z",
      endedOn: null,
    });
  });

  it("reads when an ended subscription ended and the refund still owed", async () => {
    // arrange
    const { controller } = subscriptionController(
      summaryOf(
        {
          status: "ended",
          cancelledAt: ENDED_AT,
          accessEndsAt: ENDED_AT,
          refund: {
            reason: "full-refund",
            amountCents: 44700,
            dueBy: new Date("2026-10-29T10:00:00.000Z"),
            refundedCents: 10000,
            refundedAt: null,
          },
        },
        { status: "ended", refundOutstandingCents: 34700 },
      ),
    );

    // act
    const subscription = await controller.loadClientSubscription(
      coachArgs(),
      CLIENT_ID,
    );

    // assert
    expect(subscription).toMatchObject({
      status: "ended",
      endsOn: null,
      endedOn: "2026-10-15T10:00:00.000Z",
      refund: {
        reason: "full-refund",
        amountCents: 44700,
        outstandingCents: 34700,
        refundedCents: 10000,
        currency: "eur",
        dueBy: "2026-10-29T10:00:00.000Z",
        refundedOn: null,
      },
    });
  });

  it("reads the day a refund was settled", async () => {
    // arrange
    const { controller } = subscriptionController(
      summaryOf(
        {
          status: "ended",
          cancelledAt: ENDED_AT,
          accessEndsAt: ENDED_AT,
          refund: {
            reason: "full-refund",
            amountCents: 44700,
            dueBy: new Date("2026-10-29T10:00:00.000Z"),
            refundedCents: 44700,
            refundedAt: new Date("2026-10-20T10:00:00.000Z"),
          },
        },
        { status: "ended", refundOutstandingCents: 0 },
      ),
    );

    // act
    const subscription = await controller.loadClientSubscription(
      coachArgs(),
      CLIENT_ID,
    );

    // assert
    expect(subscription?.refund).toMatchObject({
      outstandingCents: 0,
      refundedOn: "2026-10-20T10:00:00.000Z",
    });
  });

  it("reads a reduced price for a subscription bought at the reduced tier", async () => {
    // arrange
    const { controller } = subscriptionController(
      summaryOf({ tier: "reduced" }),
    );

    // act
    const subscription = await controller.loadClientSubscription(
      coachArgs(),
      CLIENT_ID,
    );

    // assert
    expect(subscription?.reducedPrice).toBe(true);
  });

  it("names the day her work starts when she chose to wait", async () => {
    // arrange
    const { controller } = subscriptionController(
      summaryOf(
        { startChoice: "waiting" },
        { workStartsOn: new Date("2026-10-10T10:00:00.000Z") },
      ),
    );

    // act
    const subscription = await controller.loadClientSubscription(
      coachArgs(),
      CLIENT_ID,
    );

    // assert
    expect(subscription?.workStartsOn).toBe("2026-10-10T10:00:00.000Z");
  });

  it("reads no subscription for a client without one", async () => {
    // arrange
    const { controller } = subscriptionController(null);

    // act
    const subscription = await controller.loadClientSubscription(
      coachArgs(),
      CLIENT_ID,
    );

    // assert
    expect(subscription).toBeNull();
  });

  it("reads no subscription without asking for one when the client id is not a uuid", async () => {
    // arrange
    const { controller, readSubscriptionSummary } =
      subscriptionController(summaryOf());

    // act
    const subscription = await controller.loadClientSubscription(
      coachArgs(),
      "not-a-uuid",
    );

    // assert
    expect(subscription).toBeNull();
    expect(readSubscriptionSummary).not.toHaveBeenCalled();
  });

  it("refuses a client account with 403 without reading a subscription", async () => {
    // arrange
    const { controller, readSubscriptionSummary } =
      subscriptionController(summaryOf());

    // act
    const thrown = await controller
      .loadClientSubscription(
        coachArgs({
          account: { ...COACH, role: "CLIENT" },
          kind: "authenticated",
        }),
        CLIENT_ID,
      )
      .catch((error: unknown) => error);

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(readSubscriptionSummary).not.toHaveBeenCalled();
  });
});

function summaryOf(
  subscription: Partial<CoachingSubscriptionSnapshot> = {},
  readings: {
    status?: CoachingSubscriptionSnapshot["status"];
    workStartsOn?: Date | null;
    refundOutstandingCents?: number | null;
  } = {},
) {
  return {
    subscription: { ...SUBSCRIPTION, ...subscription },
    status: "not-started",
    workStartsOn: null,
    refundOutstandingCents: null,
    ...readings,
  };
}

function subscriptionController(summary: unknown) {
  const readSubscriptionSummary = vi.fn().mockResolvedValue(summary);
  const controller = new CoachSalesController({
    readCallSalesStates: { execute: vi.fn() } as never,
    readPricingTiers: { execute: vi.fn() } as never,
    readSubscriptionSummary: { execute: readSubscriptionSummary } as never,
  });

  return { controller, readSubscriptionSummary };
}

function coachArgs(
  session: ResolvedSession = { account: COACH, kind: "authenticated" },
) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(sessionContext, session),
    ],
    request: new Request(`https://evoa.fit/coach/clients/${CLIENT_ID}`),
  });
}
