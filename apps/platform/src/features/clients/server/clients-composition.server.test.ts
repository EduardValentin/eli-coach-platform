import type { DatabaseClient } from "@eli-coach-platform/db";
import type { CoachingStandingSnapshot } from "@eli-coach-platform/domain/client";
import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { createLinkTokens } from "@eli-coach-platform/infrastructure/link-tokens/server";
import { describe, expect, it, vi } from "vitest";

import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  writeClient,
  writeCoachingStanding,
} from "~/features/clients/data/clients/client-writers.server";
import { writeReviewStamps } from "~/features/clients/data/journeys/review-stamps.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import {
  composeClientsFeature,
  type ClientsFeatureHandles,
} from "./clients-composition.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const SUBMITTED_AT = new Date("2026-10-15T10:00:00.000Z");
const NOT_STARTED: CoachingStandingSnapshot = {
  status: "not-started",
  accessEndsAt: null,
  refundDue: false,
  bundleMonths: 3,
};

describe("composeClientsFeature invitation acceptance", () => {
  it("refuses a subject whose identity carries no invitation without reading any invitation", async () => {
    // arrange
    const { handles } = composeClientsFeature(createHandles());

    // act
    const outcome = await handles.invitationAcceptance.accept({
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
    const reading = handles.onboardingClients.findByAuthSubjectId("user_ana");

    // assert
    await expect(reading).rejects.toThrow("database down");
  });

  it("reads the client's identity from the clients table", async () => {
    // arrange
    const { handles } = composeClientsFeature(createHandles());

    // act
    const reading = handles.clientIdentities.findByClientId(CLIENT_ID);

    // assert
    await expect(reading).rejects.toThrow("database down");
  });

  it("reads whether a client exists for her resources from the clients table", async () => {
    // arrange
    const { handles } = composeClientsFeature(createHandles());

    // act
    const reading = handles.resourceClients.exists(CLIENT_ID);

    // assert
    await expect(reading).rejects.toThrow("database down");
  });

  it("stamps the submitted onboarding on the clients table", async () => {
    // arrange
    const { handles } = composeClientsFeature(createHandles());

    // act
    const stamping =
      handles.onboardingSubmissionStamps.recordOnboardingSubmitted({
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
    const stamping = handles.onboardingReviewStamps.record({
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

  it("hands out the writers other features call inside their own transaction", () => {
    // arrange
    const { handles } = composeClientsFeature(createHandles());

    // act
    const writers = [
      handles.reviewStampWriter,
      handles.writeClient,
      handles.writeCoachingStanding,
    ];

    // assert
    expect(writers).toEqual([
      writeReviewStamps,
      writeClient,
      writeCoachingStanding,
    ]);
  });
});

describe("composeClientsFeature resource clients", () => {
  it.each([
    [
      "reachable once she submitted onboarding and her coaching runs",
      { onboardingSubmittedAt: SUBMITTED_AT, standing: NOT_STARTED },
      "reachable",
    ],
    [
      "unreachable once her coaching ended",
      {
        onboardingSubmittedAt: SUBMITTED_AT,
        standing: {
          ...NOT_STARTED,
          status: "ended",
          accessEndsAt: SUBMITTED_AT,
        },
      },
      "unreachable",
    ],
    [
      "unreachable before she submitted onboarding",
      { onboardingSubmittedAt: null, standing: NOT_STARTED },
      "unreachable",
    ],
  ] as const)("answers her portal %s", async (_label, row, portal) => {
    // arrange
    const { handles } = composeClientsFeature({
      ...createHandles(),
      database: createDatabaseAnswering([[clientRow(row)]]),
    });

    // act
    const client =
      await handles.resourceClients.findByAuthSubjectId("user_ana");

    // assert
    expect(client).toEqual({ clientId: CLIENT_ID, portal });
  });

  it("answers no client for a subject bound to none", async () => {
    // arrange
    const { handles } = composeClientsFeature({
      ...createHandles(),
      database: createDatabaseAnswering([[]]),
    });

    // act
    const client =
      await handles.resourceClients.findByAuthSubjectId("user_unknown");

    // assert
    expect(client).toBeNull();
  });
});

describe("composeClientsFeature check-in clients", () => {
  it("answers her client with her portal reachable once she submitted onboarding and her coaching runs", async () => {
    // arrange
    const { handles } = composeClientsFeature({
      ...createHandles(),
      database: createDatabaseAnswering([
        [clientRow({ onboardingSubmittedAt: SUBMITTED_AT })],
      ]),
    });

    // act
    const client = await handles.checkInClients.findByAuthSubjectId("user_ana");

    // assert
    expect(client).toEqual({
      clientId: CLIENT_ID,
      portal: "reachable",
      coachingEndsAt: null,
    });
  });

  it("answers a signed-in client's coaching end once her coaching is cancelled", async () => {
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
          }),
        ],
      ]),
    });

    // act
    const client = await handles.checkInClients.findByAuthSubjectId("user_ana");

    // assert
    expect(client?.coachingEndsAt).toEqual(endsAt);
  });

  it("names each client and gives her email, and nothing else of her identity", async () => {
    // arrange
    const { handles } = composeClientsFeature({
      ...createHandles(),
      database: createDatabaseAnswering([
        [
          {
            clientId: CLIENT_ID,
            firstName: "Ana",
            lastName: "Popescu",
            email: "ana@example.com",
            dateOfBirth: "1994-03-14",
            gender: "female",
            country: "RO",
            phone: "+40712345678",
          },
        ],
      ]),
    });

    // act
    const identities = await handles.checkInClients.identitiesOf([CLIENT_ID]);

    // assert
    expect(identities).toEqual([
      {
        clientId: CLIENT_ID,
        firstName: "Ana",
        lastName: "Popescu",
        email: "ana@example.com",
      },
    ]);
  });
});

describe("composeClientsFeature check-in client references", () => {
  it("answers her portal reach and the zone she booked her assessment call from", async () => {
    // arrange
    const { handles } = composeClientsFeature({
      ...createHandles(),
      database: createDatabaseAnswering([
        [
          clientRow({
            onboardingSubmittedAt: SUBMITTED_AT,
            timeZone: "America/New_York",
          }),
        ],
      ]),
    });

    // act
    const client = await handles.checkInClients.findById(CLIENT_ID);

    // assert
    expect(client).toEqual({
      clientId: CLIENT_ID,
      portal: "reachable",
      bookingTimeZone: "America/New_York",
      coachingEndsAt: null,
    });
  });

  it.each([
    [
      "awaiting onboarding while her coaching runs and she has not sent it",
      {
        onboardingSubmittedAt: null,
        standing: { ...NOT_STARTED, status: "active" },
      },
      "awaiting_onboarding",
    ],
    [
      "ended once her coaching ended",
      {
        onboardingSubmittedAt: SUBMITTED_AT,
        standing: {
          ...NOT_STARTED,
          status: "ended",
          accessEndsAt: SUBMITTED_AT,
        },
      },
      "ended",
    ],
  ] as const)("answers her portal %s", async (_label, row, portal) => {
    // arrange
    const { handles } = composeClientsFeature({
      ...createHandles(),
      database: createDatabaseAnswering([[clientRow(row)]]),
    });

    // act
    const client = await handles.checkInClients.findById(CLIENT_ID);

    // assert
    expect(client?.portal).toBe(portal);
  });

  it("answers a referenced client's coaching end once her coaching is cancelled", async () => {
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
          }),
        ],
      ]),
    });

    // act
    const client = await handles.checkInClients.findById(CLIENT_ID);

    // assert
    expect(client?.coachingEndsAt).toEqual(endsAt);
  });

  it("answers no client when none is recorded", async () => {
    // arrange
    const { handles } = composeClientsFeature({
      ...createHandles(),
      database: createDatabaseAnswering([[]]),
    });

    // act
    const client = await handles.checkInClients.findById(CLIENT_ID);

    // assert
    expect(client).toBeNull();
  });
});

describe("composeClientsFeature coach clients", () => {
  it("answers no clients and reports the failure when the roster cannot be read", async () => {
    // arrange
    const incidents = createIncidents();
    const { feature } = composeClientsFeature({
      ...createHandles(),
      incidents,
    });

    // act
    const roster = await feature.coachClients.loadRoster(
      coachArgs(new Request("https://evoa.fit/coach/clients")),
    );

    // assert
    expect(roster).toEqual({ clients: null });
    expect(incidents.rosterReadFailed).toHaveBeenCalledWith(
      new Error("database down"),
    );
  });

  it("re-sends an invitation through the clients table", async () => {
    // arrange
    const { feature } = composeClientsFeature(createHandles());

    // act
    const resending = feature.coachClients.resendInvitation(
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
    contexts: [
      contextEntry(sessionContext, {
        account: { authSubjectId: "user_1", id: "acct_1", role: "COACH" },
        kind: "authenticated",
      }),
    ],
    request,
  });
}

function createHandles(): ClientsFeatureHandles {
  return {
    appBasePath: "/eli-coach-platform",
    assessmentCallReader: { findById: async () => null },
    clock: { now: () => new Date("2026-10-20T10:00:00.000Z") },
    contactEmail: "contact@evoa.fit",
    database: createUnreachableDatabase(),
    identityInvitations: {
      create: async () => {
        throw new Error("no identity invitation expected");
      },
      findInvitationIdForSubject: async () => null,
      replace: async () => {
        throw new Error("no identity invitation expected");
      },
    },
    incidents: createIncidents(),
    linkTokens: createLinkTokens(),
    productEmail: new InMemoryProductEmail(),
    publicAppUrl: "https://evoa.fit",
  };
}

function createIncidents() {
  return {
    invitationEmailFailed: vi.fn(),
    invitationResendFailed: vi.fn(),
    invitationResent: vi.fn(),
    rosterReadFailed: vi.fn(),
  };
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
