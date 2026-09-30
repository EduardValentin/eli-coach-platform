import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import { describe, expect, it } from "vitest";

import { clientMeasurementsTable } from "~/features/client-profile/data/schema.server";

import {
  PostgresClientMeasurements,
  recordMeasurementEntry,
} from "./client-measurements-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const FIRST_RECORDED_AT = new Date("2026-09-29T09:00:00.000Z");
const SECOND_RECORDED_AT = new Date("2026-10-29T09:00:00.000Z");

describe("PostgresClientMeasurements#listByClientId", () => {
  it("maps her rows oldest first and leaves out the circumferences she never took", async () => {
    // arrange
    const measurements = new PostgresClientMeasurements(
      createDatabaseAnswering([
        {
          recordedAt: FIRST_RECORDED_AT,
          weightKg: 66.1,
          waistCm: 74,
          hipsCm: null,
          thighCm: null,
          armCm: null,
        },
        {
          recordedAt: SECOND_RECORDED_AT,
          weightKg: 64.5,
          waistCm: 72,
          hipsCm: 96.5,
          thighCm: 55,
          armCm: 28.5,
        },
      ]),
    );

    // act
    const entries = await measurements.listByClientId(CLIENT_ID);

    // assert
    expect(entries).toEqual([
      { recordedAt: FIRST_RECORDED_AT, weightKg: 66.1, waistCm: 74 },
      {
        recordedAt: SECOND_RECORDED_AT,
        weightKg: 64.5,
        waistCm: 72,
        hipsCm: 96.5,
        thighCm: 55,
        armCm: 28.5,
      },
    ]);
    expect(Object.keys(entries[0] ?? {})).toEqual([
      "recordedAt",
      "weightKg",
      "waistCm",
    ]);
  });

  it("answers no entries when she has no measurements", async () => {
    // arrange
    const measurements = new PostgresClientMeasurements(
      createDatabaseAnswering([]),
    );

    // act
    const entries = await measurements.listByClientId(CLIENT_ID);

    // assert
    expect(entries).toEqual([]);
  });
});

describe("recordMeasurementEntry", () => {
  it("inserts her entry through the transaction it is handed, with the circumferences she skipped left empty", async () => {
    // arrange
    const transaction = createTransactionRecordingInserts();

    // act
    await recordMeasurementEntry(transaction.handle, {
      clientId: CLIENT_ID,
      entry: {
        recordedAt: FIRST_RECORDED_AT,
        weightKg: 64.5,
        waistCm: 72,
        hipsCm: 96.5,
      },
    });

    // assert
    expect(transaction.inserted).toEqual([
      {
        table: clientMeasurementsTable,
        row: {
          clientId: CLIENT_ID,
          recordedAt: FIRST_RECORDED_AT,
          weightKg: 64.5,
          waistCm: 72,
          hipsCm: 96.5,
          thighCm: null,
          armCm: null,
        },
      },
    ]);
  });
});

function createTransactionRecordingInserts() {
  const inserted: { table: unknown; row: unknown }[] = [];
  const handle = {
    insert: (table: unknown) => ({
      values: async (row: unknown) => {
        inserted.push({ table, row });
      },
    }),
  } as unknown as DatabaseTransaction;

  return { handle, inserted };
}

function createDatabaseAnswering(rows: readonly unknown[]): DatabaseClient {
  return {
    select: () => ({
      from: () => {
        const selection = {
          where: () => selection,
          orderBy: () => Promise.resolve(rows),
        };

        return selection;
      },
    }),
  } as unknown as DatabaseClient;
}
