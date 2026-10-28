import type { DatabaseClient } from "~/shared/database";
import {
  Client,
  CoachingStanding,
  type ClientIntake,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

import { PostgresAdmittedClients } from "./admitted-clients-repository.server";

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
const STANDING = CoachingStanding.of({
  status: "cancelled",
  accessEndsAt: ACCESS_ENDS_AT,
  refundDue: true,
  bundleMonths: 3,
  programStartsAt: PROGRAM_STARTS_AT,
  paidThrough: PAID_THROUGH,
});
const STANDING_COLUMNS = {
  coachingStatus: "cancelled",
  coachingAccessEndsAt: ACCESS_ENDS_AT,
  coachingRefundDue: true,
  coachingBundleMonths: 3,
  coachingProgramStartsAt: PROGRAM_STARTS_AT,
  coachingPaidThrough: PAID_THROUGH,
};

describe("PostgresAdmittedClients#admit", () => {
  it("inserts the admitted client's row under the id the domain gave her, then her standing, through the caller's transaction", async () => {
    // arrange
    const transaction = createTransactionRecordingWrites([{ id: CLIENT_ID }]);
    const clients = new PostgresAdmittedClients(transaction.handle);

    // act
    const admitted = await clients.admit({
      client: ADMITTED_CLIENT,
      standing: STANDING,
    });

    // assert
    expect(admitted).toBe("admitted");
    expect(transaction.inserts).toEqual([
      {
        table: clientsTable,
        values: { ...INTAKE, id: CLIENT_ID, createdAt: ADMITTED_AT },
        conflictTarget: clientsTable.assessmentCallId,
      },
    ]);
    expect(transaction.updates).toEqual([
      { table: clientsTable, values: STANDING_COLUMNS },
    ]);
  });

  it("answers that the call already has a client when its call is already taken, writing no standing", async () => {
    // arrange
    const transaction = createTransactionRecordingWrites([]);
    const clients = new PostgresAdmittedClients(transaction.handle);

    // act
    const admitted = await clients.admit({
      client: ADMITTED_CLIENT,
      standing: STANDING,
    });

    // assert
    expect(admitted).toBe("call_already_has_client");
    expect(transaction.updates).toEqual([]);
  });
});

describe("PostgresAdmittedClients#recordStanding", () => {
  it("copies the standing onto the client's row through the caller's transaction", async () => {
    // arrange
    const transaction = createTransactionRecordingWrites([]);
    const clients = new PostgresAdmittedClients(transaction.handle);

    // act
    await clients.recordStanding({ clientId: CLIENT_ID, standing: STANDING });

    // assert
    expect(transaction.updates).toEqual([
      { table: clientsTable, values: STANDING_COLUMNS },
    ]);
    const filter = new PgDialect().sqlToQuery(transaction.filters[0] as SQL);
    expect(filter.sql).toBe('"app"."clients"."id" = $1');
    expect(filter.params).toEqual([CLIENT_ID]);
  });
});

function createTransactionRecordingWrites(returned: { id: string }[]) {
  const inserts: {
    table: unknown;
    values: unknown;
    conflictTarget: unknown;
  }[] = [];
  const updates: { table: unknown; values: unknown }[] = [];
  const filters: unknown[] = [];
  const handle = {
    insert: (table: unknown) => ({
      values: (values: unknown) => ({
        onConflictDoNothing: ({ target }: { target: unknown }) => {
          inserts.push({ table, values, conflictTarget: target });

          return { returning: async () => returned };
        },
      }),
    }),
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
  } as unknown as DatabaseClient;

  return { handle, filters, inserts, updates };
}
