import type { DatabaseTransaction } from "@eli-coach-platform/db";
import {
  Client,
  CoachingStanding,
  type ClientIntake,
} from "@eli-coach-platform/domain/client";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { clientsTable } from "~/features/clients/data/schema.server";

import { writeClient, writeCoachingStanding } from "./client-writers.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const ADMITTED_AT = new Date("2026-10-12T10:00:00.000Z");
const ACCESS_ENDS_AT = new Date("2027-01-12T10:00:00.000Z");
const PROGRAM_STARTS_AT = new Date("2026-10-12T10:00:00.000Z");
const PAID_THROUGH = new Date("2027-01-12T10:00:00.000Z");
const INTAKE: ClientIntake = {
  assessmentCallId: "3f2b1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d",
  firstName: "Ana",
  lastName: "Pop",
  email: "ana@example.com",
  dateOfBirth: "1994-05-17",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phone: "+40712345678",
  bookingTimeZone: "Europe/Bucharest",
};

const ADMITTED_CLIENT = Client.admitted({
  id: CLIENT_ID,
  intake: INTAKE,
  at: ADMITTED_AT,
});

describe("writeClient", () => {
  it("inserts the admitted client's row under the id the domain gave her, through the caller's transaction", async () => {
    // arrange
    const transaction = createTransactionRecordingInserts([{ id: CLIENT_ID }]);

    // act
    const written = await writeClient(transaction.handle, ADMITTED_CLIENT);

    // assert
    expect(written).toBe("written");
    expect(transaction.inserts).toEqual([
      {
        table: clientsTable,
        values: { ...INTAKE, id: CLIENT_ID, createdAt: ADMITTED_AT },
        conflictTarget: clientsTable.assessmentCallId,
      },
    ]);
  });

  it("answers that the call already has a client when its call is already taken", async () => {
    // arrange
    const transaction = createTransactionRecordingInserts([]);

    // act
    const written = await writeClient(transaction.handle, ADMITTED_CLIENT);

    // assert
    expect(written).toBe("call_already_has_client");
  });
});

describe("writeCoachingStanding", () => {
  it("copies the standing onto the client's row through the caller's transaction", async () => {
    // arrange
    const transaction = createTransactionRecordingUpdates();
    const standing = CoachingStanding.of({
      status: "cancelled",
      accessEndsAt: ACCESS_ENDS_AT,
      refundDue: true,
      bundleMonths: 3,
      programStartsAt: PROGRAM_STARTS_AT,
      paidThrough: PAID_THROUGH,
    });

    // act
    await writeCoachingStanding(transaction.handle, {
      clientId: CLIENT_ID,
      standing,
    });

    // assert
    expect(transaction.updates).toEqual([
      {
        table: clientsTable,
        values: {
          coachingStatus: "cancelled",
          coachingAccessEndsAt: ACCESS_ENDS_AT,
          coachingRefundDue: true,
          coachingBundleMonths: 3,
          coachingProgramStartsAt: PROGRAM_STARTS_AT,
          coachingPaidThrough: PAID_THROUGH,
        },
      },
    ]);
    const filter = new PgDialect().sqlToQuery(transaction.filters[0] as SQL);
    expect(filter.sql).toBe('"app"."clients"."id" = $1');
    expect(filter.params).toEqual([CLIENT_ID]);
  });
});

function createTransactionRecordingInserts(returned: { id: string }[]) {
  const inserts: {
    table: unknown;
    values: unknown;
    conflictTarget: unknown;
  }[] = [];
  const handle = {
    insert: (table: unknown) => ({
      values: (values: unknown) => ({
        onConflictDoNothing: ({ target }: { target: unknown }) => {
          inserts.push({ table, values, conflictTarget: target });

          return { returning: async () => returned };
        },
      }),
    }),
  } as unknown as DatabaseTransaction;

  return { handle, inserts };
}

function createTransactionRecordingUpdates() {
  const updates: { table: unknown; values: unknown }[] = [];
  const filters: unknown[] = [];
  const handle = {
    update: (table: unknown) => ({
      set: (values: unknown) => {
        updates.push({ table, values });

        return {
          where: async (filter: unknown) => {
            filters.push(filter);
          },
        };
      },
    }),
  } as unknown as DatabaseTransaction;

  return { handle, filters, updates };
}
