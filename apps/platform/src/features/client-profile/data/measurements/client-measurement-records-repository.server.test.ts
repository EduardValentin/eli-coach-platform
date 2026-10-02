import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it } from "vitest";

import { clientMeasurementsTable } from "~/features/client-profile/data/schema.server";

import { PostgresClientMeasurementRecords } from "./client-measurement-records-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const FIRST_ENTRY_ID = "0f5c7e1a-2b3d-4c5e-8f9a-1b2c3d4e5f60";
const SECOND_ENTRY_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const FRONT_PHOTO_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const BACK_PHOTO_ID = "3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f";
const FIRST_RECORDED_AT = new Date("2026-09-29T09:00:00.000Z");
const SECOND_RECORDED_AT = new Date("2026-10-27T09:00:00.000Z");

const SECOND_ENTRY_COLUMNS = {
  id: SECOND_ENTRY_ID,
  recordedAt: SECOND_RECORDED_AT,
  weightKg: 64.5,
  waistCm: 72,
  hipsCm: 96.5,
  thighCm: null,
  armCm: null,
};

describe("PostgresClientMeasurementRecords#listByClientId", () => {
  it("gathers each entry with its photos and leaves out the circumferences she skipped", async () => {
    // arrange
    const records = new PostgresClientMeasurementRecords(
      createDatabaseAnswering([
        {
          id: FIRST_ENTRY_ID,
          recordedAt: FIRST_RECORDED_AT,
          weightKg: 66.1,
          waistCm: 74,
          hipsCm: null,
          thighCm: null,
          armCm: null,
          photo: null,
        },
        {
          ...SECOND_ENTRY_COLUMNS,
          photo: photoColumns(FRONT_PHOTO_ID, "front"),
        },
        {
          ...SECOND_ENTRY_COLUMNS,
          photo: photoColumns(BACK_PHOTO_ID, "back"),
        },
      ]),
    );

    // act
    const listed = await records.listByClientId(CLIENT_ID);

    // assert
    expect(listed).toEqual([
      {
        id: FIRST_ENTRY_ID,
        recordedAt: FIRST_RECORDED_AT,
        weightKg: 66.1,
        waistCm: 74,
        photos: [],
      },
      {
        id: SECOND_ENTRY_ID,
        recordedAt: SECOND_RECORDED_AT,
        weightKg: 64.5,
        waistCm: 72,
        hipsCm: 96.5,
        photos: [
          photoSnapshot(FRONT_PHOTO_ID, "front"),
          photoSnapshot(BACK_PHOTO_ID, "back"),
        ],
      },
    ]);
    expect(Object.keys(listed[0] ?? {})).not.toContain("hipsCm");
  });

  it("answers no records when she has no measurements", async () => {
    // arrange
    const records = new PostgresClientMeasurementRecords(
      createDatabaseAnswering([]),
    );

    // act
    const listed = await records.listByClientId(CLIENT_ID);

    // assert
    expect(listed).toEqual([]);
  });
});

describe("PostgresClientMeasurementRecords#record", () => {
  it("inserts her entry with the circumferences she skipped left empty and answers its id", async () => {
    // arrange
    const database = createDatabaseRecordingInserts(FIRST_ENTRY_ID);
    const records = new PostgresClientMeasurementRecords(database.client);

    // act
    const entryId = await records.record(CLIENT_ID, {
      recordedAt: FIRST_RECORDED_AT,
      weightKg: 64.5,
      waistCm: 72,
      armCm: 28.5,
    });

    // assert
    expect(entryId).toBe(FIRST_ENTRY_ID);
    expect(database.inserted).toEqual([
      {
        table: clientMeasurementsTable,
        row: {
          clientId: CLIENT_ID,
          recordedAt: FIRST_RECORDED_AT,
          weightKg: 64.5,
          waistCm: 72,
          hipsCm: null,
          thighCm: null,
          armCm: 28.5,
        },
      },
    ]);
  });
});

function photoColumns(id: string, view: "front" | "back") {
  return {
    id,
    entryId: SECOND_ENTRY_ID,
    clientId: CLIENT_ID,
    view,
    storageKey: `${CLIENT_ID}/${SECOND_ENTRY_ID}/${id}.bin`,
    keyId: "local-1",
    mimeType: "image/jpeg",
    sizeBytes: 182_431,
    createdAt: SECOND_RECORDED_AT,
  };
}

function photoSnapshot(id: string, view: "front" | "back") {
  return {
    id,
    entryId: SECOND_ENTRY_ID,
    clientId: CLIENT_ID,
    view,
    reference: {
      storageKey: `${CLIENT_ID}/${SECOND_ENTRY_ID}/${id}.bin`,
      keyId: "local-1",
    },
    mimeType: "image/jpeg",
    sizeBytes: 182_431,
    createdAt: SECOND_RECORDED_AT,
  };
}

function createDatabaseAnswering(rows: readonly unknown[]): DatabaseClient {
  return {
    select: () => ({
      from: () => {
        const selection = {
          leftJoin: () => selection,
          where: () => selection,
          orderBy: () => Promise.resolve(rows),
        };

        return selection;
      },
    }),
  } as unknown as DatabaseClient;
}

function createDatabaseRecordingInserts(insertedId: string) {
  const inserted: { table: unknown; row: unknown }[] = [];
  const client = {
    insert: (table: unknown) => ({
      values: (row: unknown) => ({
        returning: async () => {
          inserted.push({ table, row });

          return [{ id: insertedId }];
        },
      }),
    }),
  } as unknown as DatabaseClient;

  return { client, inserted };
}
