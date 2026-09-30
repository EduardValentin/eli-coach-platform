import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  ClientProfile,
  type ClientProfileSnapshot,
} from "@eli-coach-platform/domain/client-profile";
import { describe, expect, it } from "vitest";

import { clientProfilesTable } from "~/features/client-onboarding/data/schema.server";

import {
  PostgresClientProfiles,
  saveClientProfile,
} from "./client-profiles-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const UPDATED_AT = new Date("2026-09-30T10:00:00.000Z");

const SNAPSHOT: ClientProfileSnapshot = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: null,
  heightCm: 168,
  startingWeightKg: 64.5,
  currentWeightKg: 63.8,
  activityLevel: "Lightly active",
  primaryGoal: "Lose fat",
  dietaryRestrictions: "Vegetarian",
  clientNotes: null,
  updatedAt: UPDATED_AT,
};

const PROFILE_COLUMNS = Object.fromEntries(
  Object.entries(SNAPSHOT).filter(([column]) => column !== "clientId"),
);

describe("PostgresClientProfiles#findByClientId", () => {
  it("rebuilds her profile from its row", async () => {
    // arrange
    const profiles = new PostgresClientProfiles(
      createDatabaseAnswering([SNAPSHOT]),
    );

    // act
    const profile = await profiles.findByClientId(CLIENT_ID);

    // assert
    expect(profile?.toSnapshot()).toEqual(SNAPSHOT);
  });

  it("answers no profile before she has sent her onboarding", async () => {
    // arrange
    const profiles = new PostgresClientProfiles(createDatabaseAnswering([]));

    // act
    const profile = await profiles.findByClientId(CLIENT_ID);

    // assert
    expect(profile).toBeNull();
  });
});

describe("saveClientProfile", () => {
  it("inserts her profile created now, or rewrites every column but its creation moment", async () => {
    // arrange
    const transaction = createTransactionRecordingUpserts();

    // act
    await saveClientProfile(
      transaction.client,
      ClientProfile.reconstitute(SNAPSHOT),
    );

    // assert
    expect(transaction.upserts).toEqual([
      {
        table: clientProfilesTable,
        row: { ...SNAPSHOT, createdAt: UPDATED_AT },
        target: clientProfilesTable.clientId,
        set: PROFILE_COLUMNS,
      },
    ]);
  });
});

function createDatabaseAnswering(rows: readonly unknown[]): DatabaseClient {
  return {
    select: () => ({
      from: () => {
        const selection = {
          where: () => selection,
          limit: () => Promise.resolve(rows),
        };

        return selection;
      },
    }),
  } as unknown as DatabaseClient;
}

function createTransactionRecordingUpserts() {
  const upserts: unknown[] = [];
  const client = {
    insert: (table: unknown) => ({
      values: (row: unknown) => ({
        onConflictDoUpdate: async (config: {
          target: unknown;
          set: unknown;
        }) => {
          upserts.push({ table, row, ...config });
        },
      }),
    }),
  } as unknown as DatabaseTransaction;

  return { client, upserts };
}
