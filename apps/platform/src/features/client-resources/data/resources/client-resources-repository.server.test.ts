import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ClientResource,
  type ClientResourceSnapshot,
} from "@eli-coach-platform/domain/client-resources";
import { desc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { clientResourcesTable } from "~/features/client-resources/data/schema.server";

import { PostgresClientResources } from "./client-resources-repository.server";

const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const PDF_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const SPREADSHEET_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const PDF_ADDED_AT = new Date("2026-10-05T09:30:00.000Z");
const SPREADSHEET_ADDED_AT = new Date("2026-10-04T08:00:00.000Z");

const PDF_SNAPSHOT: ClientResourceSnapshot = {
  id: PDF_ID,
  clientId: CLIENT_ID,
  title: "Meal plan",
  description: "Week one",
  file: {
    originalName: "Meal plan.pdf",
    format: "pdf",
    sizeBytes: 182_431,
    pageCount: 3,
  },
  addedAt: PDF_ADDED_AT,
};

const PDF_ROW = {
  id: PDF_ID,
  clientId: CLIENT_ID,
  title: "Meal plan",
  description: "Week one",
  originalName: "Meal plan.pdf",
  format: "pdf",
  sizeBytes: 182_431,
  pageCount: 3,
  addedAt: PDF_ADDED_AT,
};

const SPREADSHEET_ROW = {
  id: SPREADSHEET_ID,
  clientId: CLIENT_ID,
  title: "Macros",
  description: "",
  originalName: "macros.ods",
  format: "ods",
  sizeBytes: 9_120,
  pageCount: null,
  addedAt: SPREADSHEET_ADDED_AT,
};

describe("PostgresClientResources#add", () => {
  it("inserts the resource with its file facts spread into columns", async () => {
    // arrange
    const database = createDatabaseRecordingWrites();
    const resources = new PostgresClientResources(database.client);

    // act
    await resources.add(ClientResource.reconstitute(PDF_SNAPSHOT));

    // assert
    expect(database.writes).toEqual([
      { table: clientResourcesTable, row: PDF_ROW },
    ]);
  });
});

describe("PostgresClientResources#listForClient", () => {
  it("reads only that client's resources, newest first and by id within one instant", async () => {
    // arrange
    const database = createDatabaseAnswering([PDF_ROW, SPREADSHEET_ROW]);
    const resources = new PostgresClientResources(database.client);

    // act
    const listed = await resources.listForClient(CLIENT_ID);

    // assert
    expect(listed.map((resource) => resource.toSnapshot())).toEqual([
      PDF_SNAPSHOT,
      {
        id: SPREADSHEET_ID,
        clientId: CLIENT_ID,
        title: "Macros",
        description: "",
        file: {
          originalName: "macros.ods",
          format: "ods",
          sizeBytes: 9_120,
          pageCount: null,
        },
        addedAt: SPREADSHEET_ADDED_AT,
      },
    ]);
    expect(database.query).toEqual({
      filter: eq(clientResourcesTable.clientId, CLIENT_ID),
      order: [
        desc(clientResourcesTable.addedAt),
        desc(clientResourcesTable.id),
      ],
    });
  });
});

describe("PostgresClientResources#findById", () => {
  it("rebuilds the resource from its row", async () => {
    // arrange
    const database = createDatabaseAnswering([PDF_ROW]);
    const resources = new PostgresClientResources(database.client);

    // act
    const resource = await resources.findById(PDF_ID);

    // assert
    expect(resource?.toSnapshot()).toEqual(PDF_SNAPSHOT);
    expect(database.query.filter).toEqual(eq(clientResourcesTable.id, PDF_ID));
  });

  it("answers no resource for an id it does not hold", async () => {
    // arrange
    const resources = new PostgresClientResources(
      createDatabaseAnswering([]).client,
    );

    // act
    const resource = await resources.findById(PDF_ID);

    // assert
    expect(resource).toBeNull();
  });
});

function createDatabaseAnswering(rows: readonly unknown[]) {
  const query: { filter?: unknown; order?: unknown[] } = {};
  const client = {
    select: () => ({
      from: () => ({
        where: (filter: unknown) => {
          query.filter = filter;

          return {
            orderBy: (...order: unknown[]) => {
              query.order = order;

              return Promise.resolve(rows);
            },
            limit: () => Promise.resolve(rows),
          };
        },
      }),
    }),
  } as unknown as DatabaseClient;

  return { client, query };
}

function createDatabaseRecordingWrites() {
  const writes: unknown[] = [];
  const client = {
    insert: (table: unknown) => ({
      values: async (row: unknown) => {
        writes.push({ table, row });
      },
    }),
  } as unknown as DatabaseClient;

  return { client, writes };
}
