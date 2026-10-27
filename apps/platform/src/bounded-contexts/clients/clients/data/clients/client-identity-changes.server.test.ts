import type { DatabaseClient } from "~/shared/database";
import { VisitorCountries } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import { ClientIdentityEdit } from "~/bounded-contexts/clients/clients/domain/client";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { clientsTable } from "~/bounded-contexts/clients/clients/data/schema.server";

import { PostgresClientIdentityChanges } from "./client-identity-changes.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

describe("PostgresClientIdentityChanges#save", () => {
  it("rewrites her names, phone, date of birth, country and gender on her client row, never her email", async () => {
    // arrange
    const database = createDatabaseRecordingUpdates();
    const changes = new PostgresClientIdentityChanges(database.client);
    const result = ClientIdentityEdit.of(
      {
        clientId: CLIENT_ID,
        firstName: "Ana-Maria",
        lastName: "Ionescu",
        phone: { country: "RO", nationalNumber: "0712345678" },
        dateOfBirth: "1994-03-15",
        country: "MD",
        gender: "female",
      },
      {
        on: new Date("2026-10-24T10:00:00.000Z"),
        timeZone: "Europe/Bucharest",
      },
      VisitorCountries.of([
        { code: "RO", callingCode: "+40" },
        { code: "MD", callingCode: "+373" },
      ]),
    );
    if (result.status !== "valid") throw new Error(result.status);

    // act
    await changes.save(result.edit);

    // assert
    expect(database.updates).toEqual([
      {
        table: clientsTable,
        set: {
          firstName: "Ana-Maria",
          lastName: "Ionescu",
          phone: "+40712345678",
          dateOfBirth: "1994-03-15",
          country: "MD",
          gender: "female",
        },
        filter: eq(clientsTable.id, CLIENT_ID),
      },
    ]);
  });
});

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
