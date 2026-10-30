import type { DatabaseClient } from "~/shared/database";
import type { CoachingStandingSnapshot } from "~/bounded-contexts/clients/clients/domain/client";
import { describe, expect, it } from "vitest";

import { PostgresClientReachRepository } from "./postgres-client-reach-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const NOW = new Date("2026-10-12T10:00:00.000Z");
const SUBMITTED_AT = new Date("2026-10-01T10:00:00.000Z");
const ACCESS_ENDS_AT = new Date("2026-11-01T10:00:00.000Z");
const PROGRAM_STARTS_AT = new Date("2026-10-02T10:00:00.000Z");
const PAID_THROUGH = new Date("2027-01-02T10:00:00.000Z");
const ACTIVE: CoachingStandingSnapshot = {
  status: "active",
  accessEndsAt: null,
  refundDue: false,
  bundleMonths: 3,
  programStartsAt: PROGRAM_STARTS_AT,
  paidThrough: PAID_THROUGH,
};

const CLIENT_ROW = {
  clientId: CLIENT_ID,
  onboardingSubmittedAt: SUBMITTED_AT,
  timeZone: "Europe/Bucharest",
  standing: ACTIVE,
};

function reachAnswering(rows: readonly Record<string, unknown>[]) {
  return new PostgresClientReachRepository({
    clock: { now: () => NOW },
    database: createDatabaseAnswering(rows),
  });
}

describe("PostgresClientReach#findByAuthSubjectId", () => {
  it("reads the client bound to the subject as reachable in her booking time zone, with her program start and paid-through date", async () => {
    // arrange
    const reach = reachAnswering([CLIENT_ROW]);

    // act
    const reading = await reach.findByAuthSubjectId("user_ana");

    // assert
    expect(reading).toEqual({
      clientId: CLIENT_ID,
      portal: "reachable",
      coachingEndsAt: null,
      timeZone: "Europe/Bucharest",
      programStartsAt: PROGRAM_STARTS_AT,
      paidThrough: PAID_THROUGH,
    });
  });

  it("answers null for a subject no client is bound to", async () => {
    // arrange
    const reach = reachAnswering([]);

    // act
    const reading = await reach.findByAuthSubjectId("user_unknown");

    // assert
    expect(reading).toBeNull();
  });
});

describe("PostgresClientReach#findById", () => {
  it.each([
    [
      "awaiting her onboarding",
      { onboardingSubmittedAt: null },
      "awaiting_onboarding",
    ],
    [
      "whose cancelled coaching ran out",
      {
        standing: {
          ...ACTIVE,
          status: "cancelled",
          accessEndsAt: new Date("2026-10-01T10:00:00.000Z"),
        },
      },
      "ended",
    ],
  ] as const)(
    "reads a client %s through the standing on her row",
    async (_label, overrides, portal) => {
      // arrange
      const reach = reachAnswering([{ ...CLIENT_ROW, ...overrides }]);

      // act
      const reading = await reach.findById(CLIENT_ID);

      // assert
      expect(reading?.portal).toBe(portal);
    },
  );

  it("carries the end of a cancelled coaching", async () => {
    // arrange
    const reach = reachAnswering([
      {
        ...CLIENT_ROW,
        standing: {
          ...ACTIVE,
          status: "cancelled",
          accessEndsAt: ACCESS_ENDS_AT,
        },
      },
    ]);

    // act
    const reading = await reach.findById(CLIENT_ID);

    // assert
    expect(reading?.coachingEndsAt).toEqual(ACCESS_ENDS_AT);
    expect(reading?.portal).toBe("reachable");
  });

  it("answers null for an unknown client", async () => {
    // arrange
    const reach = reachAnswering([]);

    // act
    const reading = await reach.findById(CLIENT_ID);

    // assert
    expect(reading).toBeNull();
  });
});

function createDatabaseAnswering(
  rows: readonly Record<string, unknown>[],
): DatabaseClient {
  return {
    select: (columns: Record<string, unknown>) => {
      const selection = {
        from: () => selection,
        where: () => selection,
        limit: () =>
          Promise.resolve(
            rows.map((row) =>
              Object.fromEntries(
                Object.keys(columns).map((column) => [column, row[column]]),
              ),
            ),
          ),
      };

      return selection;
    },
  } as unknown as DatabaseClient;
}
