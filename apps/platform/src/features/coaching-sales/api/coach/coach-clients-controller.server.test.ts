import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type { ClientRosterEntry } from "@eli-coach-platform/domain/client-roster";
import type { CoachingSubscriptionSnapshot } from "@eli-coach-platform/domain/coaching-subscription";
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

import { CoachClientsController } from "./coach-clients-controller.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const OTHER_CLIENT_ID = "0b8d2f7e-2f55-4d3e-9d7c-7d7a3f1c2b10";
const PAID_AT = new Date("2026-09-26T10:00:00.000Z");
const SENT_AT = new Date("2026-09-26T10:05:00.000Z");
const EXPIRES_AT = new Date("2026-10-26T10:05:00.000Z");

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

const RECORD_READINGS = {
  status: "invited",
  needsRefund: false,
  subscriptionStatus: "not-started",
  subscriptionCancelledOrEnded: false,
  refundOutstandingCents: null,
  workStartsOn: null,
} as const;

const BOOKED_CALL = {
  startsAt: new Date("2026-09-24T15:00:00.000Z"),
  firstName: "Ana-Maria",
  lastName: "Popescu",
  email: "ana.booked@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: "+40700000000",
  primaryGoal: "lose_weight",
  notes: null,
} as const;

function rosterEntry(
  overrides: Partial<ClientRosterEntry> & { clientId?: string } = {},
): ClientRosterEntry {
  return {
    journey: {
      clientId: overrides.clientId ?? CLIENT_ID,
      firstName: "Ana",
      lastName: "Popescu",
      gender: "female",
      welcomeSeenAt: null,
      onboardingSubmittedAt: null,
      reviewOpenedAt: null,
      detailsRequestedAt: null,
      detailsAnsweredAt: null,
      answersApprovedAt: null,
    },
    accountBound: overrides.accountBound ?? false,
    booking: {
      email: "ana@example.com",
      gender: "female",
      assessmentCallId: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
    },
    subscription:
      overrides.subscription === undefined
        ? SUBSCRIPTION
        : overrides.subscription,
  };
}

describe("CoachClientsController#loadRoster", () => {
  it("lists every client with her status, bundle length and payment moment", async () => {
    // arrange
    const { controller } = createController({
      listed: {
        status: "listed",
        clients: [
          { ...rosterEntry(), status: "invited", needsRefund: true },
          {
            ...rosterEntry({ clientId: OTHER_CLIENT_ID, subscription: null }),
            status: "onboarding",
            needsRefund: false,
          },
        ],
      },
    });

    // act
    const roster = await controller.loadRoster(coachArgs());

    // assert
    expect(roster).toEqual({
      clients: [
        {
          clientId: CLIENT_ID,
          firstName: "Ana",
          lastName: "Popescu",
          email: "ana@example.com",
          status: "invited",
          needsRefund: true,
          bundleMonths: 3,
          paidAt: "2026-09-26T10:00:00.000Z",
        },
        {
          clientId: OTHER_CLIENT_ID,
          firstName: "Ana",
          lastName: "Popescu",
          email: "ana@example.com",
          status: "onboarding",
          needsRefund: false,
          bundleMonths: null,
          paidAt: null,
        },
      ],
    });
  });

  it("answers no clients when the roster cannot be read", async () => {
    // arrange
    const { controller } = createController({
      listed: { status: "unavailable" },
    });

    // act
    const roster = await controller.loadRoster(coachArgs());

    // assert
    expect(roster).toEqual({ clients: null });
  });

  it.each(signedInRefusals())(
    "refuses %s with 403 without reading the roster",
    async (_label, session) => {
      // arrange
      const { controller, listClients } = createController({});

      // act
      const thrown = await captureThrown(() =>
        controller.loadRoster(coachArgs({ session })),
      );

      // assert
      expect((thrown as Response).status).toBe(403);
      expect(listClients).not.toHaveBeenCalled();
    },
  );

  it("sends an anonymous visitor to sign in without reading the roster", async () => {
    // arrange
    const { controller, listClients } = createController({});

    // act
    const thrown = await captureThrown(() =>
      controller.loadRoster(coachArgs({ session: { kind: "anonymous" } })),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect(listClients).not.toHaveBeenCalled();
  });
});

describe("CoachClientsController#loadClient", () => {
  it("reads her record with her gender, the call as she booked it, subscription and pending invitation", async () => {
    // arrange
    const { controller, readClientInvitation, readClientRecord } =
      createController({
        record: {
          ...rosterEntry(),
          ...RECORD_READINGS,
          assessmentCall: { ...BOOKED_CALL, notes: "I train at home." },
        },
        invitation: {
          state: "pending",
          sentAt: SENT_AT,
          expiresAt: EXPIRES_AT,
        },
      });

    // act
    const client = await controller.loadClient(coachArgs(), CLIENT_ID);

    // assert
    expect(client).toEqual({
      clientId: CLIENT_ID,
      firstName: "Ana",
      lastName: "Popescu",
      email: "ana@example.com",
      status: "invited",
      needsRefund: false,
      subscriptionCancelledOrEnded: false,
      gender: "female",
      assessmentCall: {
        startsAt: "2026-09-24T15:00:00.000Z",
        firstName: "Ana-Maria",
        lastName: "Popescu",
        email: "ana.booked@example.com",
        dateOfBirth: "1994-03-14",
        gender: "female",
        country: "RO",
        phone: "+40700000000",
        primaryGoal: "lose_weight",
        notes: "I train at home.",
      },
      subscription: {
        bundleId: "3-months",
        months: 3,
        reducedPrice: false,
        paidAt: "2026-09-26T10:00:00.000Z",
        workStartsOn: null,
        status: "not-started",
        endsOn: null,
        endedOn: null,
        refund: null,
      },
      invitation: {
        state: "pending",
        sentAt: "2026-09-26T10:05:00.000Z",
        expiresAt: "2026-10-26T10:05:00.000Z",
      },
    });
    expect(readClientRecord).toHaveBeenCalledWith(CLIENT_ID);
    expect(readClientInvitation).toHaveBeenCalledWith(CLIENT_ID);
  });

  it("reads when a cancelled subscription ends", async () => {
    // arrange
    const { controller } = createController({
      record: {
        ...rosterEntry({
          subscription: {
            ...SUBSCRIPTION,
            status: "cancelled",
            cancelledAt: new Date("2026-10-15T10:00:00.000Z"),
            accessEndsAt: new Date("2026-12-26T10:00:00.000Z"),
          },
        }),
        ...RECORD_READINGS,
        status: "cancelled",
        subscriptionStatus: "cancelled",
        subscriptionCancelledOrEnded: true,
        assessmentCall: BOOKED_CALL,
      },
    });

    // act
    const client = await controller.loadClient(coachArgs(), CLIENT_ID);

    // assert
    expect(client.subscriptionCancelledOrEnded).toBe(true);
    expect(client.subscription).toMatchObject({
      status: "cancelled",
      endsOn: "2026-12-26T10:00:00.000Z",
      endedOn: null,
    });
  });

  it("reads when an ended subscription ended and the refund still owed", async () => {
    // arrange
    const endedAt = new Date("2026-10-15T10:00:00.000Z");
    const { controller } = createController({
      record: {
        ...rosterEntry({
          subscription: {
            ...SUBSCRIPTION,
            status: "ended",
            cancelledAt: endedAt,
            accessEndsAt: endedAt,
            refund: {
              reason: "full-refund",
              amountCents: 44700,
              dueBy: new Date("2026-10-29T10:00:00.000Z"),
              refundedCents: 10000,
              refundedAt: null,
            },
          },
        }),
        ...RECORD_READINGS,
        status: "inactive",
        needsRefund: true,
        subscriptionStatus: "ended",
        subscriptionCancelledOrEnded: true,
        refundOutstandingCents: 34700,
        assessmentCall: BOOKED_CALL,
      },
    });

    // act
    const client = await controller.loadClient(coachArgs(), CLIENT_ID);

    // assert
    expect(client.needsRefund).toBe(true);
    expect(client.subscriptionCancelledOrEnded).toBe(true);
    expect(client.subscription).toMatchObject({
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
    const endedAt = new Date("2026-10-15T10:00:00.000Z");
    const { controller } = createController({
      record: {
        ...rosterEntry({
          subscription: {
            ...SUBSCRIPTION,
            status: "ended",
            cancelledAt: endedAt,
            accessEndsAt: endedAt,
            refund: {
              reason: "full-refund",
              amountCents: 44700,
              dueBy: new Date("2026-10-29T10:00:00.000Z"),
              refundedCents: 44700,
              refundedAt: new Date("2026-10-20T10:00:00.000Z"),
            },
          },
        }),
        ...RECORD_READINGS,
        status: "inactive",
        subscriptionStatus: "ended",
        subscriptionCancelledOrEnded: true,
        refundOutstandingCents: 0,
        assessmentCall: BOOKED_CALL,
      },
    });

    // act
    const client = await controller.loadClient(coachArgs(), CLIENT_ID);

    // assert
    expect(client.subscription?.refund).toMatchObject({
      outstandingCents: 0,
      refundedOn: "2026-10-20T10:00:00.000Z",
    });
  });

  it("reads a reduced price for a subscription bought at the reduced tier", async () => {
    // arrange
    const entry = rosterEntry();
    const { controller } = createController({
      record: {
        ...entry,
        subscription: entry.subscription && {
          ...entry.subscription,
          tier: "reduced",
        },
        ...RECORD_READINGS,
        assessmentCall: BOOKED_CALL,
      },
    });

    // act
    const client = await controller.loadClient(coachArgs(), CLIENT_ID);

    // assert
    expect(client.subscription?.reducedPrice).toBe(true);
  });

  it("names the day her work starts when she chose to wait", async () => {
    // arrange
    const { controller } = createController({
      record: {
        ...rosterEntry(),
        ...RECORD_READINGS,
        workStartsOn: new Date("2026-10-10T10:00:00.000Z"),
        assessmentCall: BOOKED_CALL,
      },
    });

    // act
    const client = await controller.loadClient(coachArgs(), CLIENT_ID);

    // assert
    expect(client.subscription?.workStartsOn).toBe("2026-10-10T10:00:00.000Z");
  });

  it("reads no subscription for a client without one", async () => {
    // arrange
    const { controller } = createController({
      record: {
        ...rosterEntry({ subscription: null }),
        ...RECORD_READINGS,
        status: "onboarding",
        subscriptionStatus: null,
        assessmentCall: BOOKED_CALL,
      },
    });

    // act
    const client = await controller.loadClient(coachArgs(), CLIENT_ID);

    // assert
    expect(client.subscription).toBeNull();
    expect(client.subscriptionCancelledOrEnded).toBe(false);
  });

  it("reads no invitation once her account is bound", async () => {
    // arrange
    const { controller } = createController({
      record: {
        ...rosterEntry({ accountBound: true }),
        ...RECORD_READINGS,
        status: "onboarding",
        assessmentCall: BOOKED_CALL,
      },
      invitation: { state: "pending", sentAt: SENT_AT, expiresAt: EXPIRES_AT },
    });

    // act
    const client = await controller.loadClient(coachArgs(), CLIENT_ID);

    // assert
    expect(client.invitation).toBeNull();
  });

  it("answers 404 for an unknown client", async () => {
    // arrange
    const { controller } = createController({ record: null });

    // act
    const thrown = await captureThrown(() =>
      controller.loadClient(coachArgs(), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("answers 404 without reading anything for an id that is not a uuid", async () => {
    // arrange
    const { controller, readClientRecord } = createController({});

    // act
    const thrown = await captureThrown(() =>
      controller.loadClient(coachArgs(), "client-1"),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
    expect(readClientRecord).not.toHaveBeenCalled();
  });

  it.each(signedInRefusals())(
    "refuses %s with 403 without reading her record",
    async (_label, session) => {
      // arrange
      const { controller, readClientRecord } = createController({});

      // act
      const thrown = await captureThrown(() =>
        controller.loadClient(coachArgs({ session }), CLIENT_ID),
      );

      // assert
      expect((thrown as Response).status).toBe(403);
      expect(readClientRecord).not.toHaveBeenCalled();
    },
  );

  it("sends an anonymous visitor to sign in without reading her record", async () => {
    // arrange
    const { controller, readClientRecord } = createController({});

    // act
    const thrown = await captureThrown(() =>
      controller.loadClient(
        coachArgs({ session: { kind: "anonymous" } }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect(readClientRecord).not.toHaveBeenCalled();
  });
});

describe("CoachClientsController#resendInvitation", () => {
  it("re-sends her invitation and answers 200 with the address it went to", async () => {
    // arrange
    const { controller, resendInvitation } = createController({
      resent: { status: "sent", email: "ana@example.com" },
    });

    // act
    const response = await controller.resendInvitation(resendArgs({}));

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "sent",
      email: "ana@example.com",
    });
    expect(resendInvitation).toHaveBeenCalledWith(CLIENT_ID);
  });

  it.each([
    ["not-found", 404, "not-found"],
    ["already-admitted", 409, "already-admitted"],
    ["subscription-cancelled-or-ended", 409, "subscription-cancelled-or-ended"],
    ["failed", 503, "send-failed"],
  ] as const)(
    "answers the %s outcome with %i and names it %s",
    async (status, httpStatus, error) => {
      // arrange
      const { controller } = createController({ resent: { status } });

      // act
      const response = await controller.resendInvitation(resendArgs({}));

      // assert
      expect(response.status).toBe(httpStatus);
      await expect(response.json()).resolves.toEqual({ error });
    },
  );

  it.each([
    ["the client id is not a uuid", JSON.stringify({ clientId: "client-1" })],
    ["the body is not JSON", "clientId=client-1"],
    [
      "the body is larger than a re-send needs",
      JSON.stringify({ clientId: CLIENT_ID, padding: "x".repeat(2048) }),
    ],
  ])("answers 400 and re-sends nothing when %s", async (_label, body) => {
    // arrange
    const { controller, resendInvitation } = createController({});

    // act
    const response = await controller.resendInvitation(resendArgs({ body }));

    // assert
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
    });
    expect(resendInvitation).not.toHaveBeenCalled();
  });

  it("refuses an anonymous caller with 401 and re-sends nothing", async () => {
    // arrange
    const { controller, resendInvitation } = createController({});

    // act
    const thrown = await captureThrown(() =>
      controller.resendInvitation(
        resendArgs({ session: { kind: "anonymous" } }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(401);
    expect(resendInvitation).not.toHaveBeenCalled();
  });

  it("refuses a client account with 403 and re-sends nothing", async () => {
    // arrange
    const { controller, resendInvitation } = createController({});

    // act
    const thrown = await captureThrown(() =>
      controller.resendInvitation(
        resendArgs({ session: authenticatedAs("CLIENT") }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(resendInvitation).not.toHaveBeenCalled();
  });
});

function signedInRefusals(): [string, ResolvedSession][] {
  return [["a client account", authenticatedAs("CLIENT")]];
}

function createController(outcomes: {
  listed?: unknown;
  record?: unknown;
  invitation?: unknown;
  resent?: unknown;
}) {
  const listClients = vi.fn().mockResolvedValue(outcomes.listed);
  const readClientRecord = vi.fn().mockResolvedValue(outcomes.record ?? null);
  const readClientInvitation = vi
    .fn()
    .mockResolvedValue(outcomes.invitation ?? null);
  const resendInvitation = vi.fn().mockResolvedValue(outcomes.resent);
  const controller = new CoachClientsController({
    listClients: { execute: listClients } as never,
    readClientRecord: { execute: readClientRecord } as never,
    readClientInvitation: { execute: readClientInvitation } as never,
    resendInvitation: { execute: resendInvitation } as never,
  });

  return {
    controller,
    listClients,
    readClientInvitation,
    readClientRecord,
    resendInvitation,
  };
}

function coachArgs(options: { session?: ResolvedSession } = {}) {
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
      contextEntry(
        sessionContext,
        options.session ?? { account: COACH, kind: "authenticated" },
      ),
    ],
    request: new Request("https://evoa.fit/coach/clients"),
  });
}

function resendArgs(options: { body?: string; session?: ResolvedSession }) {
  return createRequestArgs({
    contexts: [
      contextEntry(
        sessionContext,
        options.session ?? { account: COACH, kind: "authenticated" },
      ),
    ],
    request: new Request(
      "https://evoa.fit/api/coaching-sales/invitation-resends",
      {
        body: options.body ?? JSON.stringify({ clientId: CLIENT_ID }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    ),
  });
}

function authenticatedAs(role: AccountSnapshot["role"]): ResolvedSession {
  return {
    account: { authSubjectId: "user_1", id: "acct_1", role },
    kind: "authenticated",
  };
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
  } catch (error) {
    return error;
  }

  throw new Error("Expected the call to throw.");
}
