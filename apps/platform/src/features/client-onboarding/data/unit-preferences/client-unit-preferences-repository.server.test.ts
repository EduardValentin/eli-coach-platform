import type { DatabaseClient } from "@eli-coach-platform/db";
import { UnitPreference } from "@eli-coach-platform/domain/unit-preference";
import { describe, expect, it } from "vitest";

import { PostgresClientUnitPreferences } from "./client-unit-preferences-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const SAVED_AT = new Date("2026-10-22T09:00:00.000Z");

describe("PostgresClientUnitPreferences#findByClientId", () => {
  it("reads the units she chose", async () => {
    // arrange
    const preferences = new PostgresClientUnitPreferences(
      createDatabaseAnswering([{ weightUnit: "lb", heightUnit: "ft-in" }]),
    );

    // act
    const preference = await preferences.findByClientId(CLIENT_ID);

    // assert
    expect(preference?.toSnapshot()).toEqual({
      weightUnit: "lb",
      heightUnit: "ft-in",
    });
  });

  it("answers null before she chooses any units", async () => {
    // arrange
    const preferences = new PostgresClientUnitPreferences(
      createDatabaseAnswering([]),
    );

    // act
    const preference = await preferences.findByClientId(CLIENT_ID);

    // assert
    expect(preference).toBeNull();
  });
});

describe("PostgresClientUnitPreferences#save", () => {
  it("writes her units and replaces the ones she chose before", async () => {
    // arrange
    const database = createDatabaseRecordingUpserts();
    const preferences = new PostgresClientUnitPreferences(database.client);

    // act
    await preferences.save({
      clientId: CLIENT_ID,
      preference: UnitPreference.of("imperial"),
      at: SAVED_AT,
    });

    // assert
    expect(database.inserted).toEqual([
      {
        clientId: CLIENT_ID,
        weightUnit: "lb",
        heightUnit: "ft-in",
        updatedAt: SAVED_AT,
      },
    ]);
    expect(database.conflictUpdates).toEqual([
      { weightUnit: "lb", heightUnit: "ft-in", updatedAt: SAVED_AT },
    ]);
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

function createDatabaseRecordingUpserts() {
  const inserted: unknown[] = [];
  const conflictUpdates: unknown[] = [];
  const client = {
    insert: () => ({
      values: (row: unknown) => {
        inserted.push(row);

        return {
          onConflictDoUpdate: async (config: { set: unknown }) => {
            conflictUpdates.push(config.set);
          },
        };
      },
    }),
  } as unknown as DatabaseClient;

  return { client, conflictUpdates, inserted };
}
