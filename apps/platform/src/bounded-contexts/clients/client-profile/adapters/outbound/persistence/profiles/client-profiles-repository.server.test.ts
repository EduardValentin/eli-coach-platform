import type { DatabaseClient } from "~/shared/database";
import {
  ClientProfile,
  type ClientProfileSnapshot,
  type CoachingFactsSnapshot,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { clientProfilesTable } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/schema.server";

import { PostgresClientProfiles } from "./client-profiles-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const OPENED_AT = new Date("2026-09-20T10:00:00.000Z");
const SEEDED_AT = new Date("2026-09-30T10:00:00.000Z");
const SAVED_AT = new Date("2026-10-24T12:00:00.000Z");
const CONSENTED_AT = new Date("2026-09-29T08:30:00.000Z");

const COACHING: CoachingFactsSnapshot = {
  heightCm: 168,
  trainingDays: 3,
  sessionMinutes: 60,
  equipment: ["Full gym", "Dumbbells"],
  trainingPlace: "Gym",
  limitations: "Right shoulder.",
  level: "beginner",
  primaryGoal: "Lose fat",
  goalWeightKg: 62,
  activityLevel: "Mostly sitting",
  cycleMode: "adapted",
  dietaryRestrictions: "Vegetarian",
};

const SEEDED: ClientProfileSnapshot = {
  clientId: CLIENT_ID,
  coaching: COACHING,
  coachNotes: "Prefers mornings.",
  coachingSeededAt: SEEDED_AT,
  progressPhotosConsentedAt: CONSENTED_AT,
  createdAt: OPENED_AT,
  updatedAt: SEEDED_AT,
};

const SEEDED_ROW = {
  clientId: CLIENT_ID,
  heightCm: 168,
  trainingDaysPerWeek: 3,
  sessionMinutes: 60,
  equipment: ["Full gym", "Dumbbells"],
  trainingPlace: "Gym",
  limitations: "Right shoulder.",
  level: "beginner",
  primaryGoal: "Lose fat",
  goalWeightKg: 62,
  activityLevel: "Mostly sitting",
  cycleMode: "adapted",
  dietaryRestrictions: "Vegetarian",
  coachNotes: "Prefers mornings.",
  coachingSeededAt: SEEDED_AT,
  progressPhotosConsentedAt: CONSENTED_AT,
  createdAt: OPENED_AT,
  updatedAt: SEEDED_AT,
};

const OPENED_ROW = {
  ...SEEDED_ROW,
  heightCm: null,
  trainingDaysPerWeek: null,
  sessionMinutes: null,
  equipment: null,
  trainingPlace: null,
  limitations: null,
  level: null,
  primaryGoal: null,
  goalWeightKg: null,
  activityLevel: null,
  cycleMode: null,
  dietaryRestrictions: null,
  coachNotes: null,
  coachingSeededAt: null,
  progressPhotosConsentedAt: null,
  updatedAt: OPENED_AT,
};

describe("PostgresClientProfiles#findByClientId", () => {
  it("rebuilds her seeded coaching facts, the coach's notes and her consent from its row", async () => {
    // arrange
    const profiles = new PostgresClientProfiles(
      createDatabaseAnswering([SEEDED_ROW]),
    );

    // act
    const profile = await profiles.findByClientId(CLIENT_ID);

    // assert
    expect(profile?.toSnapshot()).toEqual(SEEDED);
  });

  it("rebuilds an opened profile with no coaching facts before her answers are approved", async () => {
    // arrange
    const profiles = new PostgresClientProfiles(
      createDatabaseAnswering([OPENED_ROW]),
    );

    // act
    const profile = await profiles.findByClientId(CLIENT_ID);

    // assert
    expect(profile?.toSnapshot()).toEqual({
      clientId: CLIENT_ID,
      coaching: null,
      coachNotes: null,
      coachingSeededAt: null,
      progressPhotosConsentedAt: null,
      createdAt: OPENED_AT,
      updatedAt: OPENED_AT,
    });
  });

  it("answers no profile for a client without a row", async () => {
    // arrange
    const profiles = new PostgresClientProfiles(createDatabaseAnswering([]));

    // act
    const profile = await profiles.findByClientId(CLIENT_ID);

    // assert
    expect(profile).toBeNull();
  });
});

describe("PostgresClientProfiles#saveSharedFacts", () => {
  it("writes only the shared facts and the update moment while the row is as it was read", async () => {
    // arrange
    const database = createDatabaseRecordingUpdates([{ clientId: CLIENT_ID }]);
    const profiles = new PostgresClientProfiles(database.client);
    const edited = ClientProfile.reconstitute({
      ...SEEDED,
      coaching: { ...COACHING, heightCm: 170, level: "advanced" },
      updatedAt: SAVED_AT,
    });

    // act
    const outcome = await profiles.saveSharedFacts({
      profile: edited,
      expectedUpdatedAt: SEEDED_AT,
    });

    // assert
    expect(outcome).toBe("saved");
    expect(database.updates).toEqual([
      {
        table: clientProfilesTable,
        set: {
          heightCm: 170,
          trainingDaysPerWeek: 3,
          sessionMinutes: 60,
          equipment: ["Full gym", "Dumbbells"],
          trainingPlace: "Gym",
          limitations: "Right shoulder.",
          updatedAt: SAVED_AT,
        },
        filter: and(
          eq(clientProfilesTable.clientId, CLIENT_ID),
          eq(clientProfilesTable.updatedAt, SEEDED_AT),
        ),
      },
    ]);
  });

  it("answers changed-meanwhile when no row matched the moment it was read", async () => {
    // arrange
    const database = createDatabaseRecordingUpdates([]);
    const profiles = new PostgresClientProfiles(database.client);

    // act
    const outcome = await profiles.saveSharedFacts({
      profile: ClientProfile.reconstitute({ ...SEEDED, updatedAt: SAVED_AT }),
      expectedUpdatedAt: SEEDED_AT,
    });

    // assert
    expect(outcome).toBe("changed-meanwhile");
  });

  it("refuses to save a profile edited without coaching facts", async () => {
    // arrange
    const database = createDatabaseRecordingUpdates([{ clientId: CLIENT_ID }]);
    const profiles = new PostgresClientProfiles(database.client);

    // act
    const saving = profiles.saveSharedFacts({
      profile: ClientProfile.reconstitute({ ...SEEDED, coaching: null }),
      expectedUpdatedAt: SEEDED_AT,
    });

    // assert
    await expect(saving).rejects.toThrow(
      "An edited client profile has no coaching facts.",
    );
  });
});

describe("PostgresClientProfiles#saveCoachFacts", () => {
  it("writes every coaching fact, the coach's notes and the update moment while the row is as it was read", async () => {
    // arrange
    const database = createDatabaseRecordingUpdates([{ clientId: CLIENT_ID }]);
    const profiles = new PostgresClientProfiles(database.client);
    const edited = ClientProfile.reconstitute({
      ...SEEDED,
      coaching: { ...COACHING, trainingDays: 4 },
      coachNotes: null,
      updatedAt: SAVED_AT,
    });

    // act
    const outcome = await profiles.saveCoachFacts({
      profile: edited,
      expectedUpdatedAt: SEEDED_AT,
    });

    // assert
    expect(outcome).toBe("saved");
    expect(database.updates).toEqual([
      {
        table: clientProfilesTable,
        set: {
          heightCm: 168,
          trainingDaysPerWeek: 4,
          sessionMinutes: 60,
          equipment: ["Full gym", "Dumbbells"],
          trainingPlace: "Gym",
          limitations: "Right shoulder.",
          level: "beginner",
          primaryGoal: "Lose fat",
          goalWeightKg: 62,
          activityLevel: "Mostly sitting",
          cycleMode: "adapted",
          dietaryRestrictions: "Vegetarian",
          coachNotes: null,
          updatedAt: SAVED_AT,
        },
        filter: and(
          eq(clientProfilesTable.clientId, CLIENT_ID),
          eq(clientProfilesTable.updatedAt, SEEDED_AT),
        ),
      },
    ]);
  });
});

describe("PostgresClientProfiles#recordPhotoConsent", () => {
  it("stamps the moment she agreed to progress photos on her profile row only", async () => {
    // arrange
    const database = createDatabaseRecordingUpdates([]);
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

function createDatabaseRecordingUpdates(returned: readonly unknown[]) {
  const updates: unknown[] = [];
  const client = {
    update: (table: unknown) => ({
      set: (set: unknown) => ({
        where: (filter: unknown) => {
          updates.push({ table, set, filter });

          return Object.assign(Promise.resolve(undefined), {
            returning: async () => returned,
          });
        },
      }),
    }),
  } as unknown as DatabaseClient;

  return { client, updates };
}
