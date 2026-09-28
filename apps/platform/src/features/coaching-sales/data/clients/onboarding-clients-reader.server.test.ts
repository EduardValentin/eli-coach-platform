import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it } from "vitest";

import { PostgresOnboardingClients } from "./onboarding-clients-reader.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

describe("PostgresOnboardingClients#findByAuthSubjectId", () => {
  it("reads the id, gender and date of birth of the client bound to the subject", async () => {
    // arrange
    const clients = new PostgresOnboardingClients(
      createDatabaseAnswering([
        {
          clientId: CLIENT_ID,
          gender: "female",
          dateOfBirth: "1994-03-14",
        },
      ]),
    );

    // act
    const client = await clients.findByAuthSubjectId("user_ana");

    // assert
    expect(client).toEqual({
      clientId: CLIENT_ID,
      gender: "female",
      dateOfBirth: "1994-03-14",
    });
  });

  it("answers null for a subject no client is bound to", async () => {
    // arrange
    const clients = new PostgresOnboardingClients(createDatabaseAnswering([]));

    // act
    const client = await clients.findByAuthSubjectId("user_unknown");

    // assert
    expect(client).toBeNull();
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
