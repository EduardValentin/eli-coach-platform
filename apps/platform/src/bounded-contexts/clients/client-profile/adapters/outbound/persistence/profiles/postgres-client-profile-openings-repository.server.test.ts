import type { DatabaseClient } from "~/shared/database";
import type { CoachingSeed } from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  clientProfilesTable,
  clientSettingsTable,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/schema.server";

import {
  openClientProfile,
  recordPhotoConsent,
  seedCoaching,
} from "./postgres-client-profile-openings-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const ADMITTED_AT = new Date("2026-09-20T10:00:00.000Z");
const CONSENTED_AT = new Date("2026-09-29T08:30:00.000Z");
const APPROVED_AT = new Date("2026-09-30T10:00:00.000Z");

const SEED: CoachingSeed = {
  coaching: {
    heightCm: 168,
    trainingDays: 3,
    sessionMinutes: 60,
    equipment: ["Full gym"],
    trainingPlace: "Gym",
    limitations: "",
    level: "beginner",
    primaryGoal: "Lose fat",
    goalWeightKg: 62,
    activityLevel: "Mostly sitting",
    cycleMode: "adapted",
    dietaryRestrictions: "None",
  },
  preferences: {
    preferredCheckInWeekday: "monday",
    preferredChannel: "email",
  },
};

describe("openClientProfile", () => {
  it("opens her empty profile and her metric settings at admission", async () => {
    // arrange
    const transaction = createTransactionRecording();

    // act
    await openClientProfile(transaction.client, {
      clientId: CLIENT_ID,
      at: ADMITTED_AT,
    });

    // assert
    expect(transaction.inserts).toEqual([
      {
        table: clientProfilesTable,
        row: {
          clientId: CLIENT_ID,
          coachNotes: null,
          coachingSeededAt: null,
          progressPhotosConsentedAt: null,
          createdAt: ADMITTED_AT,
          updatedAt: ADMITTED_AT,
        },
      },
      {
        table: clientSettingsTable,
        row: {
          clientId: CLIENT_ID,
          weightUnit: "kg",
          heightUnit: "cm",
          preferredCheckInWeekday: null,
          preferredChannel: null,
          updatedAt: ADMITTED_AT,
        },
      },
    ]);
  });
});

describe("recordPhotoConsent", () => {
  it("stamps the moment she agreed to progress photos on her profile row", async () => {
    // arrange
    const transaction = createTransactionRecording();

    // act
    await recordPhotoConsent(transaction.client, {
      clientId: CLIENT_ID,
      at: CONSENTED_AT,
    });

    // assert
    expect(transaction.updates).toEqual([
      {
        table: clientProfilesTable,
        set: { progressPhotosConsentedAt: CONSENTED_AT },
        filter: eq(clientProfilesTable.clientId, CLIENT_ID),
      },
    ]);
  });
});

describe("seedCoaching", () => {
  it("writes her coaching facts once, while they are not seeded, then her two preferences", async () => {
    // arrange
    const transaction = createTransactionRecording([{ clientId: CLIENT_ID }]);

    // act
    await seedCoaching(transaction.client, {
      clientId: CLIENT_ID,
      seed: SEED,
      at: APPROVED_AT,
    });

    // assert
    expect(transaction.updates).toEqual([
      {
        table: clientProfilesTable,
        set: {
          heightCm: 168,
          trainingDaysPerWeek: 3,
          sessionMinutes: 60,
          equipment: ["Full gym"],
          trainingPlace: "Gym",
          limitations: "",
          level: "beginner",
          primaryGoal: "Lose fat",
          goalWeightKg: 62,
          activityLevel: "Mostly sitting",
          cycleMode: "adapted",
          dietaryRestrictions: "None",
          coachingSeededAt: APPROVED_AT,
          updatedAt: APPROVED_AT,
        },
        filter: and(
          eq(clientProfilesTable.clientId, CLIENT_ID),
          isNull(clientProfilesTable.coachingSeededAt),
        ),
      },
      {
        table: clientSettingsTable,
        set: {
          preferredCheckInWeekday: "monday",
          preferredChannel: "email",
          updatedAt: APPROVED_AT,
        },
        filter: eq(clientSettingsTable.clientId, CLIENT_ID),
      },
    ]);
  });

  it("leaves her preferences alone when her coaching facts were already seeded", async () => {
    // arrange
    const transaction = createTransactionRecording([]);

    // act
    await seedCoaching(transaction.client, {
      clientId: CLIENT_ID,
      seed: SEED,
      at: APPROVED_AT,
    });

    // assert
    expect(transaction.updates).toHaveLength(1);
  });
});

function createTransactionRecording(returned: readonly unknown[] = []) {
  const inserts: unknown[] = [];
  const updates: unknown[] = [];
  const client = {
    insert: (table: unknown) => ({
      values: async (row: unknown) => {
        inserts.push({ table, row });
      },
    }),
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

  return { client, inserts, updates };
}
