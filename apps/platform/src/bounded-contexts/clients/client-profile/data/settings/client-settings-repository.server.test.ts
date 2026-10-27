import type { DatabaseClient } from "~/shared/database";
import {
  ClientSettings,
  UnitPreference,
} from "@eli-coach-platform/domain/client-settings";
import { describe, expect, it } from "vitest";

import { PostgresClientSettings } from "./client-settings-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const OPENED_AT = new Date("2026-09-20T10:00:00.000Z");
const SAVED_AT = new Date("2026-10-22T09:00:00.000Z");

describe("PostgresClientSettings#findByClientId", () => {
  it("reads her units and her two preferences", async () => {
    // arrange
    const settings = new PostgresClientSettings(
      createDatabaseAnswering([
        {
          clientId: CLIENT_ID,
          weightUnit: "lb",
          heightUnit: "ft-in",
          preferredCheckInWeekday: "friday",
          preferredChannel: "whatsapp",
          updatedAt: OPENED_AT,
        },
      ]),
    );

    // act
    const found = await settings.findByClientId(CLIENT_ID);

    // assert
    expect(found?.toSnapshot()).toEqual({
      clientId: CLIENT_ID,
      unitPreference: { weightUnit: "lb", heightUnit: "ft-in" },
      preferredCheckInWeekday: "friday",
      preferredChannel: "whatsapp",
      updatedAt: OPENED_AT,
    });
  });

  it("answers null for a client without settings", async () => {
    // arrange
    const settings = new PostgresClientSettings(createDatabaseAnswering([]));

    // act
    const found = await settings.findByClientId(CLIENT_ID);

    // assert
    expect(found).toBeNull();
  });
});

describe("PostgresClientSettings#saveUnits", () => {
  it("writes her settings, and over stored ones replaces only her units and the update moment", async () => {
    // arrange
    const database = createDatabaseRecordingUpserts();
    const settings = new PostgresClientSettings(database.client);
    const changed = ClientSettings.reconstitute({
      clientId: CLIENT_ID,
      unitPreference: { weightUnit: "kg", heightUnit: "cm" },
      preferredCheckInWeekday: "monday",
      preferredChannel: "email",
      updatedAt: OPENED_AT,
    }).withUnits(UnitPreference.of("imperial"), SAVED_AT);

    // act
    await settings.saveUnits(changed);

    // assert
    expect(database.inserted).toEqual([
      {
        clientId: CLIENT_ID,
        weightUnit: "lb",
        heightUnit: "ft-in",
        preferredCheckInWeekday: "monday",
        preferredChannel: "email",
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
