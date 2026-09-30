import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it } from "vitest";

import { PostgresClientIdentities } from "./client-identities-reader.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

const IDENTITY = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: "+40712345678",
};

const CLIENT_ROW = {
  ...IDENTITY,
  primaryGoal: "lose_fat",
  authSubjectId: "user_ana",
  submittedAt: new Date("2026-10-23T09:00:00.000Z"),
};

describe("PostgresClientIdentities#findByClientId", () => {
  it("reads her identity from her client record and nothing else", async () => {
    // arrange
    const identities = new PostgresClientIdentities(
      createDatabaseAnswering([CLIENT_ROW]),
    );

    // act
    const identity = await identities.findByClientId(CLIENT_ID);

    // assert
    expect(identity).toEqual(IDENTITY);
  });

  it("answers null for an unknown client", async () => {
    // arrange
    const identities = new PostgresClientIdentities(
      createDatabaseAnswering([]),
    );

    // act
    const identity = await identities.findByClientId(CLIENT_ID);

    // assert
    expect(identity).toBeNull();
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
