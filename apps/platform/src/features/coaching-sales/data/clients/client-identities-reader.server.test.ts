import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it, vi, type Mock } from "vitest";

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

describe("PostgresClientIdentities#findByClientIds", () => {
  it("reads every found client's identity in one query", async () => {
    // arrange
    const maria = {
      ...CLIENT_ROW,
      clientId: "3f1a8f0e-2b1c-4c55-9b5e-0d6c7e8f9a10",
      firstName: "Maria",
      email: "maria@example.com",
    };
    const database = createDatabaseAnswering([CLIENT_ROW, maria]);
    const identities = new PostgresClientIdentities(database);

    // act
    const found = await identities.findByClientIds([CLIENT_ID, maria.clientId]);

    // assert
    expect(found).toEqual([
      IDENTITY,
      {
        ...IDENTITY,
        clientId: maria.clientId,
        firstName: "Maria",
        email: "maria@example.com",
      },
    ]);
    expect(database.select).toHaveBeenCalledTimes(1);
  });

  it("reads nothing for no clients", async () => {
    // arrange
    const database = createDatabaseAnswering([CLIENT_ROW]);
    const identities = new PostgresClientIdentities(database);

    // act
    const found = await identities.findByClientIds([]);

    // assert
    expect(found).toEqual([]);
    expect(database.select).not.toHaveBeenCalled();
  });
});

function createDatabaseAnswering(
  rows: readonly Record<string, unknown>[],
): DatabaseClient & { select: Mock } {
  return {
    select: vi.fn((columns: Record<string, unknown>) => {
      const projected = rows.map((row) =>
        Object.fromEntries(
          Object.keys(columns).map((column) => [column, row[column]]),
        ),
      );
      const selection = {
        from: () => selection,
        where: () => selection,
        limit: () => Promise.resolve(projected),
        then: (onFulfilled: (value: readonly unknown[]) => unknown) =>
          Promise.resolve(projected).then(onFulfilled),
      };

      return selection;
    }),
  } as unknown as DatabaseClient & { select: Mock };
}
