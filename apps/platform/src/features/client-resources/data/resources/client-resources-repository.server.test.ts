import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ClientResource,
  type ClientResourceSnapshot,
  type ResourceBrowseSnapshot,
} from "@eli-coach-platform/domain/client-resources";
import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  clientResourcesTable,
  clientResourceTagsTable,
} from "~/features/client-resources/data/schema.server";

import { PostgresClientResources } from "./client-resources-repository.server";

const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const PDF_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const SPREADSHEET_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const PDF_ADDED_AT = new Date("2026-10-05T09:30:00.000Z");
const SPREADSHEET_ADDED_AT = new Date("2026-10-04T08:00:00.000Z");
const SPREADSHEET_OPENED_AT = new Date("2026-10-06T07:15:00.000Z");

const MEALS = { tag: "Meals", folded: "meals" };
const WEEK_ONE = { tag: "Week one", folded: "week one" };

const PDF_SNAPSHOT: ClientResourceSnapshot = {
  id: PDF_ID,
  clientId: CLIENT_ID,
  title: "Meal plan",
  description: "Week one",
  tags: [WEEK_ONE, MEALS],
  file: {
    originalName: "Meal plan.pdf",
    format: "pdf",
    sizeBytes: 182_431,
    pageCount: 3,
  },
  addedAt: PDF_ADDED_AT,
  openedAt: null,
};

const SPREADSHEET_SNAPSHOT: ClientResourceSnapshot = {
  id: SPREADSHEET_ID,
  clientId: CLIENT_ID,
  title: "Macros",
  description: "",
  tags: [],
  file: {
    originalName: "macros.ods",
    format: "ods",
    sizeBytes: 9_120,
    pageCount: null,
  },
  addedAt: SPREADSHEET_ADDED_AT,
  openedAt: SPREADSHEET_OPENED_AT,
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
  openedAt: null,
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
  openedAt: SPREADSHEET_OPENED_AT,
};

const PDF_TAG_ROWS = [
  { resourceId: PDF_ID, ...WEEK_ONE },
  { resourceId: PDF_ID, ...MEALS },
];

const EVERY_RESOURCE: ResourceBrowseSnapshot = {
  tag: null,
  search: "",
  sort: "added",
  direction: "desc",
};

describe("PostgresClientResources#add", () => {
  it("inserts the resource with its file facts spread into columns and its tags in her order, in one transaction", async () => {
    // arrange
    const database = createDatabase();
    const resources = new PostgresClientResources(database.client);

    // act
    await resources.add(ClientResource.reconstitute(PDF_SNAPSHOT));

    // assert
    expect(database.writes).toEqual([
      "begin",
      { insert: clientResourcesTable, rows: PDF_ROW },
      {
        insert: clientResourceTagsTable,
        rows: [
          { resourceId: PDF_ID, ...WEEK_ONE, position: 0 },
          { resourceId: PDF_ID, ...MEALS, position: 1 },
        ],
      },
      "commit",
    ]);
  });

  it("inserts no tag rows for a resource without tags", async () => {
    // arrange
    const database = createDatabase();
    const resources = new PostgresClientResources(database.client);

    // act
    await resources.add(ClientResource.reconstitute(SPREADSHEET_SNAPSHOT));

    // assert
    expect(database.writes).toEqual([
      "begin",
      { insert: clientResourcesTable, rows: SPREADSHEET_ROW },
      "commit",
    ]);
  });
});

describe("PostgresClientResources#browseForClient", () => {
  it("rebuilds the listed resources with their tags in her order, beside the tag options and the counts", async () => {
    // arrange
    const database = createDatabase([
      [PDF_ROW, SPREADSHEET_ROW],
      [
        { tag: "Meals", folded: "meals", count: 1 },
        { tag: "Week one", folded: "week one", count: 0 },
      ],
      [{ searched: 2, total: 3 }],
      PDF_TAG_ROWS,
    ]);
    const resources = new PostgresClientResources(database.client);

    // act
    const browsed = await resources.browseForClient(CLIENT_ID, EVERY_RESOURCE);

    // assert
    expect({
      ...browsed,
      resources: browsed.resources.map((resource) => resource.toSnapshot()),
    }).toEqual({
      resources: [PDF_SNAPSHOT, SPREADSHEET_SNAPSHOT],
      tagOptions: [
        { tag: MEALS, count: 1 },
        { tag: WEEK_ONE, count: 0 },
      ],
      searched: 2,
      total: 3,
    });
  });

  it("answers no resources and reads no tags when nothing is listed", async () => {
    // arrange
    const database = createDatabase([[], [], [{ searched: 0, total: 0 }]]);
    const resources = new PostgresClientResources(database.client);

    // act
    const browsed = await resources.browseForClient(CLIENT_ID, EVERY_RESOURCE);

    // assert
    expect(browsed).toEqual({
      resources: [],
      tagOptions: [],
      searched: 0,
      total: 0,
    });
    expect(database.reads).toHaveLength(3);
  });

  it.each([
    {
      name: "the newest first",
      sort: "added",
      direction: "desc",
      order: [
        desc(clientResourcesTable.addedAt),
        desc(clientResourcesTable.id),
      ],
    },
    {
      name: "the oldest first",
      sort: "added",
      direction: "asc",
      order: [asc(clientResourcesTable.addedAt), asc(clientResourcesTable.id)],
    },
    {
      name: "by title from A to Z, the newest first within one title",
      sort: "title",
      direction: "asc",
      order: [
        asc(sql`lower(${clientResourcesTable.title})`),
        desc(clientResourcesTable.addedAt),
        desc(clientResourcesTable.id),
      ],
    },
    {
      name: "by title from Z to A, the newest first within one title",
      sort: "title",
      direction: "desc",
      order: [
        desc(sql`lower(${clientResourcesTable.title})`),
        desc(clientResourcesTable.addedAt),
        desc(clientResourcesTable.id),
      ],
    },
  ] as const)("lists $name", async ({ sort, direction, order }) => {
    // arrange
    const database = createDatabase([[], [], [{ searched: 0, total: 0 }]]);
    const resources = new PostgresClientResources(database.client);

    // act
    await resources.browseForClient(CLIENT_ID, {
      ...EVERY_RESOURCE,
      sort,
      direction,
    });

    // assert
    expect(database.reads[0]?.order).toEqual(order);
  });
});

describe("PostgresClientResources#tagsHeldBy", () => {
  it("answers each tag the client's resources hold once, in the spelling it was read", async () => {
    // arrange
    const database = createDatabase([[MEALS, WEEK_ONE]]);
    const resources = new PostgresClientResources(database.client);

    // act
    const held = await resources.tagsHeldBy(CLIENT_ID);

    // assert
    expect(held).toEqual([MEALS, WEEK_ONE]);
    expect(database.reads[0]?.filter).toEqual(
      eq(clientResourcesTable.clientId, CLIENT_ID),
    );
  });
});

describe("PostgresClientResources#tagVocabulary", () => {
  it("answers every tag the coach has used once, across her clients", async () => {
    // arrange
    const database = createDatabase([[MEALS, WEEK_ONE]]);
    const resources = new PostgresClientResources(database.client);

    // act
    const vocabulary = await resources.tagVocabulary();

    // assert
    expect(vocabulary).toEqual([MEALS, WEEK_ONE]);
    expect(database.reads[0]?.filter).toBeUndefined();
  });
});

describe("PostgresClientResources#findById", () => {
  it("rebuilds the resource from its row and its tags", async () => {
    // arrange
    const database = createDatabase([[PDF_ROW], PDF_TAG_ROWS]);
    const resources = new PostgresClientResources(database.client);

    // act
    const resource = await resources.findById(PDF_ID);

    // assert
    expect(resource?.toSnapshot()).toEqual(PDF_SNAPSHOT);
    expect(database.reads[0]?.filter).toEqual(
      eq(clientResourcesTable.id, PDF_ID),
    );
  });

  it("answers no resource for an id it does not hold", async () => {
    // arrange
    const resources = new PostgresClientResources(createDatabase([[]]).client);

    // act
    const resource = await resources.findById(PDF_ID);

    // assert
    expect(resource).toBeNull();
  });
});

describe("PostgresClientResources#recordOpened", () => {
  it("stamps the moment she opened it only on a resource not opened before", async () => {
    // arrange
    const database = createDatabase();
    const resources = new PostgresClientResources(database.client);
    const opened = ClientResource.reconstitute(PDF_SNAPSHOT).opened(
      SPREADSHEET_OPENED_AT,
    );

    // act
    await resources.recordOpened(opened);

    // assert
    expect(database.writes).toEqual([
      {
        update: clientResourcesTable,
        values: { openedAt: SPREADSHEET_OPENED_AT },
        filter: and(
          eq(clientResourcesTable.id, PDF_ID),
          isNull(clientResourcesTable.openedAt),
        ),
      },
    ]);
  });
});

describe("PostgresClientResources#saveDetails", () => {
  it("writes the title and description of that resource and replaces its tags, in one transaction", async () => {
    // arrange
    const database = createDatabase();
    const resources = new PostgresClientResources(database.client);
    const changed = ClientResource.reconstitute({
      ...PDF_SNAPSHOT,
      title: "Week two plan",
      description: "Swap the oats",
      tags: [MEALS],
      openedAt: SPREADSHEET_OPENED_AT,
    });

    // act
    await resources.saveDetails(changed);

    // assert
    expect(database.writes).toEqual([
      "begin",
      {
        update: clientResourcesTable,
        values: { title: "Week two plan", description: "Swap the oats" },
        filter: eq(clientResourcesTable.id, PDF_ID),
      },
      {
        delete: clientResourceTagsTable,
        filter: eq(clientResourceTagsTable.resourceId, PDF_ID),
      },
      {
        insert: clientResourceTagsTable,
        rows: [{ resourceId: PDF_ID, ...MEALS, position: 0 }],
      },
      "commit",
    ]);
  });

  it("removes every tag of a resource saved without tags", async () => {
    // arrange
    const database = createDatabase();
    const resources = new PostgresClientResources(database.client);

    // act
    await resources.saveDetails(
      ClientResource.reconstitute({ ...PDF_SNAPSHOT, tags: [] }),
    );

    // assert
    expect(database.writes).toEqual([
      "begin",
      expect.objectContaining({ update: clientResourcesTable }),
      {
        delete: clientResourceTagsTable,
        filter: eq(clientResourceTagsTable.resourceId, PDF_ID),
      },
      "commit",
    ]);
  });
});

describe("PostgresClientResources#remove", () => {
  it("deletes that resource's row only", async () => {
    // arrange
    const database = createDatabase();
    const resources = new PostgresClientResources(database.client);

    // act
    await resources.remove(PDF_ID);

    // assert
    expect(database.writes).toEqual([
      {
        delete: clientResourcesTable,
        filter: eq(clientResourcesTable.id, PDF_ID),
      },
    ]);
  });
});

describe("PostgresClientResources#countUnopenedForClient", () => {
  it("counts that client's resources she has not opened", async () => {
    // arrange
    const database = createDatabase([[{ unopened: 2 }]]);
    const resources = new PostgresClientResources(database.client);

    // act
    const unopened = await resources.countUnopenedForClient(CLIENT_ID);

    // assert
    expect(unopened).toBe(2);
    expect(database.reads[0]).toEqual({
      selection: { unopened: count() },
      filter: and(
        eq(clientResourcesTable.clientId, CLIENT_ID),
        isNull(clientResourcesTable.openedAt),
      ),
    });
  });
});

type RecordedRead = {
  selection?: unknown;
  filter?: unknown;
  order?: unknown[];
};

function createDatabase(answers: readonly (readonly unknown[])[] = []) {
  const pending = [...answers];
  const reads: RecordedRead[] = [];
  const writes: unknown[] = [];

  const read = (selection?: unknown) => {
    const recorded: RecordedRead = selection ? { selection } : {};
    const rows = pending.shift() ?? [];
    const chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: (filter: unknown) => {
        recorded.filter = filter;
        return chain;
      },
      groupBy: () => chain,
      orderBy: (...order: unknown[]) => {
        recorded.order = order;
        return chain;
      },
      limit: () => chain,
      then: (
        onFulfilled: (value: readonly unknown[]) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(rows).then(onFulfilled, onRejected),
    };

    reads.push(recorded);

    return chain;
  };

  const writer = {
    insert: (table: unknown) => ({
      values: async (rows: unknown) => {
        writes.push({ insert: table, rows });
      },
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: async (filter: unknown) => {
          writes.push({ update: table, values, filter });
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: async (filter: unknown) => {
        writes.push({ delete: table, filter });
      },
    }),
  };

  const client = {
    ...writer,
    select: read,
    selectDistinctOn: (_on: unknown, selection: unknown) => read(selection),
    transaction: async (work: (transaction: typeof writer) => unknown) => {
      writes.push("begin");
      const result = await work(writer);
      writes.push("commit");

      return result;
    },
  } as unknown as DatabaseClient;

  return { client, reads, writes };
}
