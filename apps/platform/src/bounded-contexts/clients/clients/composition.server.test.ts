import type { DatabaseClient } from "~/shared/database";
import type { CoachingStandingSnapshot } from "~/bounded-contexts/clients/clients/domain/client";
import { describe, expect, it, vi } from "vitest";

import { createRequestArgs } from "~/composition-root/test-support/request-args";

import {
  composeClientsFeature,
  type ClientsFeatureHandles,
} from "./composition.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const SUBMITTED_AT = new Date("2026-10-15T10:00:00.000Z");
const NOT_STARTED: CoachingStandingSnapshot = {
  status: "not-started",
  accessEndsAt: null,
  refundDue: false,
  bundleMonths: 3,
  programStartsAt: null,
  paidThrough: null,
};

describe("composeClientsFeature invitation acceptance", () => {
  it("links no client for a subject that accepted no invitation without reading any invitation", async () => {
    // arrange
    const { feature } = composeClientsFeature(createHandles());

    // act
    const outcome = await feature.acceptInvitationUseCase.execute({
      authSubjectId: "user_uninvited",
    });

    // assert
    expect(outcome).toBe("refused");
  });
});

describe("composeClientsFeature client handles", () => {
  it("reads the onboarding client from the clients table", async () => {
    // arrange
    const { handles } = composeClientsFeature(createHandles());

    // act
    const reading =
      handles.onboardingStandingsPort.findByAuthSubjectId("user_ana");

    // assert
    await expect(reading).rejects.toThrow("database down");
  });

  it("reads the client's identity from the clients table", async () => {
    // arrange
    const { handles } = composeClientsFeature(createHandles());

    // act
    const reading = handles.clientIdentitiesPort.findByClientId(CLIENT_ID);

    // assert
    await expect(reading).rejects.toThrow("database down");
  });

  it("stamps the submitted onboarding on the clients table", async () => {
    // arrange
    const { handles } = composeClientsFeature(createHandles());

    // act
    const stamping =
      handles.onboardingSubmissionRecorderPort.recordOnboardingSubmitted({
        clientId: CLIENT_ID,
        at: new Date("2026-10-20T10:00:00.000Z"),
      });

    // assert
    await expect(stamping).rejects.toThrow("database down");
  });

  it("projects the review stamps on the clients table", async () => {
    // arrange
    const { handles } = composeClientsFeature(createHandles());

    // act
    const stamping = handles.reviewStampRecorderPort.recordReviewStamp({
      clientId: CLIENT_ID,
      stamps: {
        reviewOpenedAt: new Date("2026-10-20T10:00:00.000Z"),
        detailsRequestedAt: null,
        detailsAnsweredAt: null,
        answersApprovedAt: null,
      },
    });

    // assert
    await expect(stamping).rejects.toThrow("database down");
  });

  it("hands out the admissions other bounded contexts call, each writing the clients table", async () => {
    // arrange
    const { facades } = composeClientsFeature(createHandles());

    // act
    const writing = facades.admissionsFacade.recordCoachingStanding({
      clientId: CLIENT_ID,
      standing: {
        status: "not-started",
        accessEndsAt: null,
        refundDue: false,
        bundleMonths: 3,
        programStartsAt: null,
        paidThrough: null,
      },
    });

    // assert
    await expect(writing).rejects.toThrow("database down");
  });
});

describe("composeClientsFeature client reach", () => {
  it("answers a signed-in client's portal, coaching end and booking zone from the clients table", async () => {
    // arrange
    const endsAt = new Date("2027-01-21T08:00:00.000Z");
    const { handles } = composeClientsFeature({
      ...createHandles(),
      database: createDatabaseAnswering([
        [
          clientRow({
            onboardingSubmittedAt: SUBMITTED_AT,
            standing: {
              ...NOT_STARTED,
              status: "cancelled",
              accessEndsAt: endsAt,
            },
            timeZone: "America/New_York",
          }),
        ],
      ]),
    });

    // act
    const reading =
      await handles.clientReachPort.findByAuthSubjectId("user_ana");

    // assert
    expect(reading).toEqual({
      clientId: CLIENT_ID,
      portal: "reachable",
      coachingEndsAt: endsAt,
      timeZone: "America/New_York",
      programStartsAt: null,
      paidThrough: null,
    });
  });

  it("answers a referenced client's portal by her id", async () => {
    // arrange
    const { handles } = composeClientsFeature({
      ...createHandles(),
      database: createDatabaseAnswering([
        [clientRow({ onboardingSubmittedAt: null })],
      ]),
    });

    // act
    const reading = await handles.clientReachPort.findById(CLIENT_ID);

    // assert
    expect(reading?.portal).toBe("awaiting_onboarding");
  });

  it("answers no client when none is recorded", async () => {
    // arrange
    const { handles } = composeClientsFeature({
      ...createHandles(),
      database: createDatabaseAnswering([[]]),
    });

    // act
    const reading = await handles.clientReachPort.findById(CLIENT_ID);

    // assert
    expect(reading).toBeNull();
  });
});

describe("composeClientsFeature coach clients", () => {
  it("answers no clients and reports the failure when the roster cannot be read", async () => {
    // arrange
    const logger = createLogger();
    const { feature } = composeClientsFeature({
      ...createHandles(),
      loggerPort: logger,
    });

    // act
    const roster = await feature.coachClientsController.loadRoster(
      coachArgs(new Request("https://evoa.fit/coach/clients")),
    );

    // assert
    expect(roster).toEqual({ clients: null });
    expect(logger.error).toHaveBeenCalledWith(
      "Client roster could not be read.",
      {
        errorCategory: "client_roster_read_failure",
        errorClass: "Error",
      },
    );
  });

  it("reads the invited client from the clients table before re-sending", async () => {
    // arrange
    const { feature } = composeClientsFeature(createHandles());

    // act
    const resending = feature.coachClientsController.resendInvitation(
      coachArgs(
        new Request("https://evoa.fit/api/clients/invitation-resends", {
          body: JSON.stringify({ clientId: CLIENT_ID }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      ),
    );

    // assert
    await expect(resending).rejects.toThrow("database down");
  });
});

function clientRow(overrides: {
  onboardingSubmittedAt: Date | null;
  standing?: CoachingStandingSnapshot;
  timeZone?: string;
}) {
  return {
    clientId: CLIENT_ID,
    onboardingSubmittedAt: overrides.onboardingSubmittedAt,
    timeZone: overrides.timeZone ?? "Europe/London",
    standing: overrides.standing ?? NOT_STARTED,
  };
}

function coachArgs(request: Request) {
  return createRequestArgs({
    session: {
      account: { authSubjectId: "user_1", id: "acct_1", role: "COACH" },
      kind: "authenticated",
    },
    request,
  });
}

function createHandles(): ClientsFeatureHandles {
  return {
    accountInvitationsFacade: {
      acceptedInvitationOf: async () => null,
      ensureDelivered: unexpectedAccountInvitation,
      issue: unexpectedAccountInvitation,
      resend: unexpectedAccountInvitation,
      standingOf: unexpectedAccountInvitation,
    },
    clientCallsFacade: { callOf: async () => null },
    clockPort: { now: () => new Date("2026-10-20T10:00:00.000Z") },
    database: createUnreachableDatabase(),
    loggerPort: createLogger(),
  };
}

async function unexpectedAccountInvitation(): Promise<never> {
  throw new Error("no account invitation expected");
}

function createLogger() {
  return { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
}

function createDatabaseAnswering(
  answers: readonly (readonly Record<string, unknown>[])[],
): DatabaseClient {
  const pending = [...answers];

  return {
    select: () => {
      const rows = pending.shift() ?? [];
      const selection = {
        from: () => selection,
        where: () => selection,
        orderBy: () => selection,
        limit: () => Promise.resolve(rows),
        then: (onFulfilled: (value: typeof rows) => unknown) =>
          Promise.resolve(rows).then(onFulfilled),
      };

      return selection;
    },
  } as unknown as DatabaseClient;
}

function createUnreachableDatabase(): DatabaseClient {
  const unreachable = () => {
    throw new Error("database down");
  };

  return {
    insert: unreachable,
    select: unreachable,
    transaction: unreachable,
    update: unreachable,
  } as unknown as DatabaseClient;
}
