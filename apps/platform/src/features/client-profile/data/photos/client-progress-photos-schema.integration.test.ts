import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();

const CALL_ID = "0b3a7f6e-6c2c-4a1e-9f47-2d0c1f6f9a01";
const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const ENTRY_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
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

const insertEntrySql = `
  insert into app.client_measurements (id, client_id, recorded_at, weight_kg, waist_cm)
  values ($1, $2, '2026-09-29T09:00:00Z', 64.5, 72)
`;

const insertPhotoSql = `
  insert into app.client_progress_photos
    (entry_id, client_id, view, storage_key, key_id, mime_type, size_bytes, created_at)
  values
    ($1, $2, $3, $4, 'local-1', 'image/jpeg', 182431, '2026-09-29T09:00:00Z')
`;

describe.sequential("client progress photos schema", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("refuses a second photo of the same view for one entry", async () => {
    // arrange
    await insertClientWithEntry();
    await insertPhoto({ view: "front", storageKey: "first.bin" });

    // act
    const secondFront = insertPhoto({
      view: "front",
      storageKey: "second.bin",
    });

    // assert
    await expect(secondFront).rejects.toThrow(
      /client_progress_photos_entry_id_view_unique/,
    );
    expect(await countPhotos()).toBe(1);
  });

  it("refuses two photo records pointing at the same stored file", async () => {
    // arrange
    await insertClientWithEntry();
    await insertPhoto({ view: "front", storageKey: "shared.bin" });

    // act
    const sameFile = insertPhoto({ view: "side", storageKey: "shared.bin" });

    // assert
    await expect(sameFile).rejects.toThrow(
      /client_progress_photos_storage_key_unique/,
    );
    expect(await countPhotos()).toBe(1);
  });

  it("refuses a view other than front, side or back", async () => {
    // arrange
    await insertClientWithEntry();

    // act
    const unknownView = insertPhoto({ view: "top", storageKey: "top.bin" });

    // assert
    await expect(unknownView).rejects.toThrow(
      /client_progress_photos_view_check/,
    );
    expect(await countPhotos()).toBe(0);
  });

  it("refuses a photo of an entry that does not exist", async () => {
    // arrange
    await insertClientWithEntry();

    // act
    const orphan = insertPhoto({
      view: "front",
      storageKey: "orphan.bin",
      entryId: UNKNOWN_ID,
    });

    // assert
    await expect(orphan).rejects.toThrow(
      /client_progress_photos_entry_id_client_measurements_id_fk/,
    );
    expect(await countPhotos()).toBe(0);
  });

  it("refuses a photo of a client that does not exist", async () => {
    // arrange
    await insertClientWithEntry();

    // act
    const orphan = insertPhoto({
      view: "front",
      storageKey: "orphan.bin",
      clientId: UNKNOWN_ID,
    });

    // assert
    await expect(orphan).rejects.toThrow(
      /client_progress_photos_client_id_clients_id_fk/,
    );
    expect(await countPhotos()).toBe(0);
  });
});

async function insertClientWithEntry(): Promise<void> {
  await suite.postgres.executeSql({ sql: insertCallSql, values: [CALL_ID] });
  await suite.postgres.executeSql({
    sql: insertClientSql,
    values: [CLIENT_ID, CALL_ID],
  });
  await suite.postgres.executeSql({
    sql: insertEntrySql,
    values: [ENTRY_ID, CLIENT_ID],
  });
}

function insertPhoto(photo: {
  view: string;
  storageKey: string;
  entryId?: string;
  clientId?: string;
}): Promise<unknown> {
  return suite.postgres.executeSql({
    sql: insertPhotoSql,
    values: [
      photo.entryId ?? ENTRY_ID,
      photo.clientId ?? CLIENT_ID,
      photo.view,
      photo.storageKey,
    ],
  });
}

function countPhotos(): Promise<number> {
  return suite.postgres.countRows({
    tableName: "app.client_progress_photos",
    values: [CLIENT_ID],
    whereClause: "client_id = $1",
  });
}
