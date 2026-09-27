import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it } from "vitest";

import { PostgresClientJourneys } from "./client-journeys-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const WELCOME_SEEN_AT = new Date("2026-10-22T09:00:00.000Z");

describe("PostgresClientJourneys#findByAuthSubjectId", () => {
  it("reads the journey of the client bound to the subject", async () => {
    // arrange
    const journeys = new PostgresClientJourneys(
      createDatabaseAnswering([
        {
          clientId: CLIENT_ID,
          firstName: "Ana",
          gender: "male",
          welcomeSeenAt: WELCOME_SEEN_AT,
        },
      ]),
    );

    // act
    const journey = await journeys.findByAuthSubjectId("user_invited");

    // assert
    expect(journey?.clientId).toBe(CLIENT_ID);
    expect(journey?.firstName).toBe("Ana");
    expect(journey?.step()).toBe("onboarding");
    expect(journey?.welcomeWording()).toBe("four-part");
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

function createDatabaseAnswering(rows: readonly unknown[]): DatabaseClient {
  const selection = {
    from: () => selection,
    where: () => selection,
    limit: () => Promise.resolve(rows),
  };

  return { select: () => selection } as unknown as DatabaseClient;
}

function createDatabaseRecordingUpdates() {
  const updates: unknown[] = [];
  const client = {
    update: () => ({
      set: (values: unknown) => {
        updates.push(values);

        return { where: async () => undefined };
      },
    }),
  } as unknown as DatabaseClient;

  return { client, updates };
}
