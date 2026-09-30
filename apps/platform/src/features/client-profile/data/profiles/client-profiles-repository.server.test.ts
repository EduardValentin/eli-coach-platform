import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  ClientProfile,
  type ClientProfileSnapshot,
} from "@eli-coach-platform/domain/client-profile";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { clientProfilesTable } from "~/features/client-profile/data/schema.server";

import {
  PostgresClientProfiles,
  saveClientProfile,
} from "./client-profiles-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const UPDATED_AT = new Date("2026-09-30T10:00:00.000Z");
const CONSENTED_AT = new Date("2026-09-29T08:30:00.000Z");

const SNAPSHOT: ClientProfileSnapshot = {
  clientId: CLIENT_ID,
  heightCm: 168,
  activityLevel: "Lightly active",
  primaryGoal: "Lose fat",
  dietaryRestrictions: "Vegetarian",
  clientNotes: null,
  progressPhotosConsentedAt: CONSENTED_AT,
  updatedAt: UPDATED_AT,
};

describe("PostgresClientProfiles#findByClientId", () => {
  it("rebuilds her profile facts and the moment she agreed to progress photos from its row", async () => {
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

describe("PostgresClientProfiles#recordPhotoConsent", () => {
  it("stamps the moment she agreed to progress photos on her profile row only", async () => {
    // arrange
    const database = createDatabaseRecordingUpdates();
    const profiles = new PostgresClientProfiles(database.client);

    // act
    await profiles.recordPhotoConsent(CLIENT_ID, CONSENTED_AT);

    // assert
    expect(database.updates).toEqual([
      {
        table: clientProfilesTable,
        set: { progressPhotosConsentedAt: CONSENTED_AT },
        filter: eq(clientProfilesTable.clientId, CLIENT_ID),
      },
    ]);
  });
});

describe("saveClientProfile", () => {
  it("inserts her whole profile created now, or rewrites only its facts and update moment and never her photo consent", async () => {
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
        set: {
          heightCm: 168,
          activityLevel: "Lightly active",
          primaryGoal: "Lose fat",
          dietaryRestrictions: "Vegetarian",
          clientNotes: null,
          updatedAt: UPDATED_AT,
        },
      },
    ]);
  });
});

function createDatabaseAnswering(
  rows: readonly Record<string, unknown>[],
): DatabaseClient {
  return {
    select: (fields: Record<string, unknown>) => ({
      from: () => {
        const selection = {
          where: () => selection,
          limit: () =>
            Promise.resolve(rows.map((row) => onlySelected(row, fields))),
        };

        return selection;
      },
    }),
  } as unknown as DatabaseClient;
}

function onlySelected(
  row: Record<string, unknown>,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(fields).map((field) => [field, row[field]]),
  );
}

function createDatabaseRecordingUpdates() {
  const updates: unknown[] = [];
  const client = {
    update: (table: unknown) => ({
      set: (set: unknown) => ({
        where: async (filter: unknown) => {
          updates.push({ table, set, filter });
        },
      }),
    }),
  } as unknown as DatabaseClient;

  return { client, updates };
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
