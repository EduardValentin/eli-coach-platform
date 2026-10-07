import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();

const CALL_ID = "0b3a7f6e-6c2c-4a1e-9f47-2d0c1f6f9a01";
const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const RESOURCE_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";

const insertCallSql = `
  insert into app.assessment_calls
    (id, first_name, last_name, visitor_email, visitor_notes, date_of_birth, gender, primary_goal, country, phone, starts_at, visitor_time_zone, coach_time_zone, booked_at)
  values
    ($1, 'Ana', 'Regular', 'ana@example.com', null, '1994-03-14', 'female', 'build_strength', 'RO', null, '2026-09-01T08:00:00Z', 'Europe/Bucharest', 'Europe/Bucharest', '2026-08-25T08:00:00Z')
`;

const insertClientSql = `
  insert into app.clients
    (id, assessment_call_id, first_name, last_name, email, date_of_birth, gender, primary_goal, country, phone, created_at)
  values
    ($1, $2, 'Ana', 'Regular', 'ana@example.com', '1994-03-14', 'female', 'build_strength', 'RO', null, '2026-09-01T09:00:00Z')
`;

const insertResourceSql = `
  insert into app.client_resources
    (id, client_id, title, original_name, format, size_bytes, page_count, added_at)
  values
    ($1, $2, 'Meal plan', 'Meal plan.pdf', $3, 182431, $4, '2026-10-05T09:30:00Z')
`;

type ResourceRow = {
  clientId?: string;
  format: string;
  pageCount: number | null;
};

describe.sequential("client resources schema", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("keeps a resource without a description as an empty description", async () => {
    // arrange
    await insertClient();

    // act
    await insertResource({ format: "pdf", pageCount: 3 });

    // assert
    const [row] = await suite.postgres.queryRows<{ description: string }>({
      sql: "select description from app.client_resources where id = $1",
      values: [RESOURCE_ID],
    });
    expect(row).toEqual({ description: "" });
  });

  it("keeps a Word or Excel file without a page count", async () => {
    // arrange
    await insertClient();

    // act
    await insertResource({ format: "xls", pageCount: null });

    // assert
    expect(await countResources()).toBe(1);
  });

  it("refuses a file format other than the ten it accepts", async () => {
    // arrange
    await insertClient();

    // act
    const presentation = insertResource({ format: "pptx", pageCount: null });

    // assert
    await expect(presentation).rejects.toThrow(/client_resources_format_check/);
    expect(await countResources()).toBe(0);
  });

  it("refuses a page count below one", async () => {
    // arrange
    await insertClient();

    // act
    const empty = insertResource({ format: "pdf", pageCount: 0 });

    // assert
    await expect(empty).rejects.toThrow(/client_resources_page_count_check/);
    expect(await countResources()).toBe(0);
  });

  it("refuses a resource of a client that does not exist", async () => {
    // arrange
    await insertClient();

    // act
    const orphan = insertResource({
      format: "pdf",
      pageCount: 1,
      clientId: UNKNOWN_ID,
    });

    // assert
    await expect(orphan).rejects.toThrow(
      /client_resources_client_id_clients_id_fk/,
    );
    expect(await countResources()).toBe(0);
  });
});

async function insertClient(): Promise<void> {
  await suite.postgres.executeSql({ sql: insertCallSql, values: [CALL_ID] });
  await suite.postgres.executeSql({
    sql: insertClientSql,
    values: [CLIENT_ID, CALL_ID],
  });
}

function insertResource(row: ResourceRow): Promise<unknown> {
  return suite.postgres.executeSql({
    sql: insertResourceSql,
    values: [RESOURCE_ID, row.clientId ?? CLIENT_ID, row.format, row.pageCount],
  });
}

function countResources(): Promise<number> {
  return suite.postgres.countRows({
    tableName: "app.client_resources",
    values: [],
    whereClause: "true",
  });
}
