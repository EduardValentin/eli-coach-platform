import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it } from "vitest";

import { PostgresClientJourneys } from "./client-journeys-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const WELCOME_SEEN_AT = new Date("2026-10-22T09:00:00.000Z");
const ONBOARDING_SUBMITTED_AT = new Date("2026-10-23T09:00:00.000Z");
const NO_REVIEW_STAMPS = {
  reviewOpenedAt: null,
  detailsRequestedAt: null,
  detailsAnsweredAt: null,
  answersApprovedAt: null,
};
const REQUESTED_STAMPS = {
  reviewOpenedAt: new Date("2026-10-24T09:00:00.000Z"),
  detailsRequestedAt: new Date("2026-10-24T10:00:00.000Z"),
  detailsAnsweredAt: null,
  answersApprovedAt: null,
};

describe("PostgresClientJourneys#findByAuthSubjectId", () => {
  it("reads the journey of the client bound to the subject", async () => {
    // arrange
    const journeys = new PostgresClientJourneys(
      createDatabaseAnswering([
        {
          clientId: CLIENT_ID,
          firstName: "Ana",
          gender: "male",
          lastName: "Popescu",
          welcomeSeenAt: WELCOME_SEEN_AT,
          onboardingSubmittedAt: null,
          ...NO_REVIEW_STAMPS,
        },
      ]),
    );

    // act
    const journey = await journeys.findByAuthSubjectId("user_invited");

    // assert
    expect(journey?.clientId).toBe(CLIENT_ID);
    expect(journey?.firstName).toBe("Ana");
    expect(journey?.lastName).toBe("Popescu");
    expect(journey?.step()).toBe("onboarding");
    expect(journey?.welcomeWording()).toBe("four-part");
  });

  it("reads when the client sent her onboarding", async () => {
    // arrange
    const journeys = new PostgresClientJourneys(
      createDatabaseAnswering([
        {
          clientId: CLIENT_ID,
          firstName: "Ana",
          gender: "female",
          lastName: "Popescu",
          welcomeSeenAt: WELCOME_SEEN_AT,
          onboardingSubmittedAt: ONBOARDING_SUBMITTED_AT,
          ...NO_REVIEW_STAMPS,
        },
      ]),
    );

    // act
    const journey = await journeys.findByAuthSubjectId("user_invited");

    // assert
    expect(journey?.onboardingSubmittedAt).toEqual(ONBOARDING_SUBMITTED_AT);
    expect(journey?.step()).toBe("submitted");
  });

  it("reads the review stamps the coach's review projected", async () => {
    // arrange
    const journeys = new PostgresClientJourneys(
      createDatabaseAnswering([
        {
          clientId: CLIENT_ID,
          firstName: "Ana",
          gender: "female",
          lastName: "Popescu",
          welcomeSeenAt: WELCOME_SEEN_AT,
          onboardingSubmittedAt: ONBOARDING_SUBMITTED_AT,
          ...REQUESTED_STAMPS,
        },
      ]),
    );

    // act
    const journey = await journeys.findByAuthSubjectId("user_invited");

    // assert
    expect(journey?.toSnapshot()).toMatchObject(REQUESTED_STAMPS);
    expect(journey?.step()).toBe("needs-details");
  });

  it("answers null for a subject no client is bound to", async () => {
    // arrange
    const journeys = new PostgresClientJourneys(createDatabaseAnswering([]));

    // act
    const journey = await journeys.findByAuthSubjectId("user_unknown");

    // assert
    expect(journey).toBeNull();
  });
});

describe("PostgresClientJourneys#recordWelcomeSeen", () => {
  it("records when the client saw the welcome screen", async () => {
    // arrange
    const database = createDatabaseRecordingUpdates();
    const journeys = new PostgresClientJourneys(database.client);

    // act
    await journeys.recordWelcomeSeen({
      clientId: CLIENT_ID,
      at: WELCOME_SEEN_AT,
    });

    // assert
    expect(database.updates).toEqual([{ welcomeSeenAt: WELCOME_SEEN_AT }]);
  });
});

describe("PostgresClientJourneys#recordOnboardingSubmitted", () => {
  it("records when the client sent her onboarding", async () => {
    // arrange
    const database = createDatabaseRecordingUpdates();
    const journeys = new PostgresClientJourneys(database.client);

    // act
    await journeys.recordOnboardingSubmitted({
      clientId: CLIENT_ID,
      at: ONBOARDING_SUBMITTED_AT,
    });

    // assert
    expect(database.updates).toEqual([
      { onboardingSubmittedAt: ONBOARDING_SUBMITTED_AT },
    ]);
  });
});

describe("PostgresClientJourneys#record", () => {
  it("writes the full set of review stamps of the client in its own transaction", async () => {
    // arrange
    const database = createDatabaseRecordingUpdates();
    const journeys = new PostgresClientJourneys(database.client);

    // act
    await journeys.record({ clientId: CLIENT_ID, stamps: REQUESTED_STAMPS });

    // assert
    expect(database.transactions).toBe(1);
    expect(database.updates).toEqual([REQUESTED_STAMPS]);
    expect(database.filters).toHaveLength(1);
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

function createDatabaseRecordingUpdates() {
  const updates: unknown[] = [];
  const filters: unknown[] = [];
  let transactions = 0;
  const writer = {
    update: () => ({
      set: (values: unknown) => {
        updates.push(values);

        return {
          where: async (filter: unknown) => {
            filters.push(filter);
          },
        };
      },
    }),
  };
  const client = {
    ...writer,
    transaction: async (work: (transaction: unknown) => Promise<unknown>) => {
      transactions += 1;

      return work(writer);
    },
  } as unknown as DatabaseClient;

  return {
    client,
    filters,
    updates,
    get transactions() {
      return transactions;
    },
  };
}
