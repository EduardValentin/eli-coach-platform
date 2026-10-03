import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  RefundDue,
  type CancelSubscriptionUseCase,
  type CoachingSubscriptionSnapshot,
  type OpenPaymentMethodSessionUseCase,
  type ReadClientSubscriptionUseCase,
  type StartProgramNowUseCase,
} from "@eli-coach-platform/domain/coaching-subscription";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { SubscriptionController } from "./subscription-controller.server";

const CLIENT: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

const COACH: AccountSnapshot = {
  authSubjectId: "user_coach",
  id: "acct_coach",
  role: "COACH",
};

const PAID_AT = new Date("2026-10-02T10:00:00.000Z");
const DAY_13 = new Date("2026-10-15T10:00:00.000Z");
const DEADLINE = new Date("2026-10-16T10:00:00.000Z");
const PAID_THROUGH = new Date("2027-01-02T10:00:00.000Z");

const SUBSCRIPTION: CoachingSubscriptionSnapshot = {
  id: "subscription-1",
  clientId: "client-1",
  bundleId: "3-months",
  months: 3,
  tier: "regular",
  amountCents: 44700,
  currency: "eur",
  paymentCustomerId: "cus_1",
  paymentSubscriptionId: "sub_1",
  checkoutSessionId: "cs_1",
  paidAt: PAID_AT,
  startChoice: "waiting",
  status: "not-started",
  cancelledAt: null,
  accessEndsAt: null,
  paymentProblemSince: null,
  refund: null,
};

type Reading = NonNullable<
  Awaited<ReturnType<ReadClientSubscriptionUseCase["execute"]>>
>;

const READING: Reading = {
  subscription: SUBSCRIPTION,
  status: "not-started",
  cancellationRule: "full-refund",
  withdrawalDeadline: DEADLINE,
  paidThrough: PAID_THROUGH,
  refundOnCancellationCents: 44700,
  startNowUntil: DEADLINE,
  refundOutstanding: false,
};

describe("SubscriptionController#loadSettings", () => {
  it("reads her own subscription with the cancellation that applies now, dates and cents raw", async () => {
    // arrange
    const { controller, readClientSubscription } = createController({
      reading: READING,
    });

    // act
    const settings = await controller.loadSettings(clientArgs());

    // assert
    expect(settings).toEqual({
      subscription: {
        bundleId: "3-months",
        months: 3,
        amountCents: 44700,
        currency: "eur",
        paidAt: "2026-10-02T10:00:00.000Z",
        status: "not-started",
        cancelledAt: null,
        accessEndsAt: null,
        paymentProblem: false,
      },
      cancellation: {
        rule: "full-refund",
        withdrawalDeadline: "2026-10-16T10:00:00.000Z",
        paidThrough: "2027-01-02T10:00:00.000Z",
        refundCents: 44700,
      },
      startNowUntil: "2026-10-16T10:00:00.000Z",
    });
    expect(readClientSubscription).toHaveBeenCalledWith("user_ana");
  });

  it("offers the cancellation without a refund with its dates and no refund amount", async () => {
    // arrange
    const { controller } = createController({
      reading: {
        ...READING,
        subscription: { ...SUBSCRIPTION, startChoice: "immediate" },
        cancellationRule: "no-refund",
        refundOnCancellationCents: 0,
        startNowUntil: null,
      },
    });

    // act
    const settings = await controller.loadSettings(clientArgs());

    // assert
    expect(settings.cancellation).toEqual({
      rule: "no-refund",
      withdrawalDeadline: "2026-10-16T10:00:00.000Z",
      paidThrough: "2027-01-02T10:00:00.000Z",
    });
  });

  it("offers no cancellation once she has cancelled, with her access end and a payment problem", async () => {
    // arrange
    const { controller } = createController({
      reading: {
        ...READING,
        subscription: {
          ...SUBSCRIPTION,
          status: "cancelled",
          cancelledAt: DAY_13,
          accessEndsAt: PAID_THROUGH,
          paymentProblemSince: DAY_13,
        },
        status: "cancelled",
        cancellationRule: "none",
        refundOnCancellationCents: 0,
        startNowUntil: null,
      },
    });

    // act
    const settings = await controller.loadSettings(clientArgs());

    // assert
    expect(settings).toMatchObject({
      subscription: {
        status: "cancelled",
        cancelledAt: "2026-10-15T10:00:00.000Z",
        accessEndsAt: "2027-01-02T10:00:00.000Z",
        paymentProblem: true,
      },
      cancellation: null,
      startNowUntil: null,
    });
  });

  it("answers 404 to a client with no subscription", async () => {
    // arrange
    const { controller } = createController({ reading: null });

    // act
    const thrown = await captureThrown(() =>
      controller.loadSettings(clientArgs()),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("refuses the coach", async () => {
    // arrange
    const { controller, readClientSubscription } = createController({
      reading: READING,
    });

    // act
    const thrown = await captureThrown(() =>
      controller.loadSettings(clientArgs({ account: COACH })),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(readClientSubscription).not.toHaveBeenCalled();
  });
});

describe("SubscriptionController#loadEnded", () => {
  it.each([
    ["a refund is still owed", true],
    ["nothing is owed", false],
  ])("tells the ended page whether %s", async (_label, refundOutstanding) => {
    // arrange
    const { controller } = createController({
      reading: { ...READING, status: "ended", refundOutstanding },
    });

    // act
    const ended = await controller.loadEnded(clientArgs());

    // assert
    expect(ended).toEqual({ refundDue: refundOutstanding });
  });
});

describe("SubscriptionController#cancel", () => {
  it("cancels the subscription of the signed-in client and answers what it ended", async () => {
    // arrange
    const cancelledAt = DAY_13;
    const { controller, cancelSubscription } = createController({
      cancelled: {
        status: "cancelled",
        rule: "full-refund",
        subscription: {
          ...SUBSCRIPTION,
          status: "ended",
          cancelledAt,
          accessEndsAt: cancelledAt,
          refund: RefundDue.full({
            amountCents: 44700,
            cancelledAt,
          }).toSnapshot(),
        },
      },
    });

    // act
    const response = await controller.cancel(apiArgs());

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "cancelled",
      rule: "full-refund",
      accessEndsAt: "2026-10-15T10:00:00.000Z",
      refundDue: true,
    });
    expect(cancelSubscription).toHaveBeenCalledWith("user_ana");
  });

  it.each([
    [
      "nothing_to_cancel",
      409,
      {
        error: "nothing-to-cancel",
        message:
          "This coaching has already ended, so there is nothing to cancel.",
      },
    ],
    ["provider_unavailable", 503, { error: "provider-unavailable" }],
    ["not_found", 404, { error: "not-found" }],
  ] as const)(
    "answers %s with %i",
    async (status, expectedStatus, expectedBody) => {
      // arrange
      const { controller } = createController({ cancelled: { status } });

      // act
      const response = await controller.cancel(apiArgs());

      // assert
      expect(response.status).toBe(expectedStatus);
      expect(await response.json()).toEqual(expectedBody);
    },
  );

  it("refuses the coach without cancelling anything", async () => {
    // arrange
    const { controller, cancelSubscription } = createController({});

    // act
    const thrown = await captureThrown(() =>
      controller.cancel(apiArgs({ account: COACH })),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it("refuses an anonymous visitor", async () => {
    // arrange
    const { controller, cancelSubscription } = createController({});

    // act
    const thrown = await captureThrown(() =>
      controller.cancel(apiArgs({ anonymous: true })),
    );

    // assert
    expect((thrown as Response).status).toBe(401);
    expect(cancelSubscription).not.toHaveBeenCalled();
  });
});

describe("SubscriptionController#startNow", () => {
  it("starts the program of the signed-in client now", async () => {
    // arrange
    const { controller, startProgramNow } = createController({
      started: { status: "started" },
    });

    // act
    const response = await controller.startNow(apiArgs());

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "started" });
    expect(startProgramNow).toHaveBeenCalledWith("user_ana");
  });

  it.each([
    [{ status: "refused", reason: "outside-window" }, 409, "outside-window"],
    [{ status: "refused", reason: "ended" }, 409, "ended"],
    [{ status: "not_found" }, 404, "not-found"],
  ] as const)(
    "answers a refusal %o with %i",
    async (started, expectedStatus, error) => {
      // arrange
      const { controller } = createController({ started });

      // act
      const response = await controller.startNow(apiArgs());

      // assert
      expect(response.status).toBe(expectedStatus);
      expect(await response.json()).toEqual({ error });
    },
  );
});

describe("SubscriptionController#openPaymentMethod", () => {
  it("sends her to the provider's page with a return to her settings built from configuration", async () => {
    // arrange
    const { controller, openPaymentMethodSession } = createController({
      opened: { status: "opened", url: "https://billing.stripe.com/p/1" },
    });

    // act
    const response = await controller.openPaymentMethod(
      clientArgs(undefined, "https://attacker.example/client/settings"),
    );

    // assert
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(
      "https://billing.stripe.com/p/1",
    );
    expect(openPaymentMethodSession).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      returnUrl: "https://evoa.fit/app/client/settings",
    });
  });

  it.each([
    ["ended", "/client/ended"],
    ["provider_unavailable", "/client/settings?paymentMethod=unavailable"],
  ] as const)(
    "sends her back into the portal when the session is %s",
    async (status, location) => {
      // arrange
      const { controller } = createController({ opened: { status } });

      // act
      const response = await controller.openPaymentMethod(clientArgs());

      // assert
      expect(response.status).toBe(303);
      expect(response.headers.get("Location")).toBe(location);
    },
  );

  it("answers 404 to a client with no subscription", async () => {
    // arrange
    const { controller } = createController({
      opened: { status: "not_found" },
    });

    // act
    const thrown = await captureThrown(() =>
      controller.openPaymentMethod(clientArgs()),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });
});

function createController(options: {
  reading?: Reading | null;
  cancelled?: Awaited<ReturnType<CancelSubscriptionUseCase["execute"]>>;
  started?: Awaited<ReturnType<StartProgramNowUseCase["execute"]>>;
  opened?: Awaited<ReturnType<OpenPaymentMethodSessionUseCase["execute"]>>;
}) {
  const readClientSubscription = vi
    .fn()
    .mockResolvedValue(options.reading ?? null);
  const cancelSubscription = vi.fn().mockResolvedValue(options.cancelled);
  const startProgramNow = vi.fn().mockResolvedValue(options.started);
  const openPaymentMethodSession = vi.fn().mockResolvedValue(options.opened);
  const controller = new SubscriptionController({
    appBasePath: "/app",
    cancelSubscription: {
      execute: cancelSubscription,
    } as unknown as CancelSubscriptionUseCase,
    openPaymentMethodSession: {
      execute: openPaymentMethodSession,
    } as unknown as OpenPaymentMethodSessionUseCase,
    publicAppUrl: "https://evoa.fit",
    readClientSubscription: {
      execute: readClientSubscription,
    } as unknown as ReadClientSubscriptionUseCase,
    startProgramNow: {
      execute: startProgramNow,
    } as unknown as StartProgramNowUseCase,
  });

  return {
    cancelSubscription,
    controller,
    openPaymentMethodSession,
    readClientSubscription,
    startProgramNow,
  };
}

function sessionOf(options: {
  account?: AccountSnapshot;
  anonymous?: boolean;
}): ResolvedSession {
  return options.anonymous
    ? { kind: "anonymous" }
    : { account: options.account ?? CLIENT, kind: "authenticated" };
}

function clientArgs(
  options: { account?: AccountSnapshot } = {},
  url = "https://evoa.fit/app/client/settings",
) {
  const accounts = {
    portal: {
      appBasePath: "/app",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(sessionContext, sessionOf(options)),
    ],
    request: new Request(url, { method: "POST" }),
  });
}

function apiArgs(
  options: { account?: AccountSnapshot; anonymous?: boolean } = {},
) {
  return createRequestArgs({
    contexts: [contextEntry(sessionContext, sessionOf(options))],
    request: new Request(
      "https://evoa.fit/app/api/coaching-sales/subscription-cancellation",
      { method: "POST" },
    ),
  });
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
