import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ProgressPhoto,
  type ProgressPhotoSnapshot,
} from "@eli-coach-platform/domain/client-profile";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { clientProgressPhotosTable } from "~/features/client-profile/data/schema.server";

import { PostgresProgressPhotos } from "./client-progress-photos-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const ENTRY_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const PHOTO_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const STORAGE_KEY = `${CLIENT_ID}/${ENTRY_ID}/${PHOTO_ID}.bin`;
const CREATED_AT = new Date("2026-10-27T09:00:00.000Z");

const SNAPSHOT: ProgressPhotoSnapshot = {
  id: PHOTO_ID,
  entryId: ENTRY_ID,
  clientId: CLIENT_ID,
  view: "side",
  reference: { storageKey: STORAGE_KEY, keyId: "local-1" },
  mimeType: "image/jpeg",
  sizeBytes: 182_431,
  createdAt: CREATED_AT,
};

const ROW = {
  id: PHOTO_ID,
  entryId: ENTRY_ID,
  clientId: CLIENT_ID,
  view: "side",
  storageKey: STORAGE_KEY,
  keyId: "local-1",
  mimeType: "image/jpeg",
  sizeBytes: 182_431,
  createdAt: CREATED_AT,
};

describe("PostgresProgressPhotos#add", () => {
  it("inserts the photo record with its storage reference spread into columns", async () => {
    // arrange
    const database = createDatabaseRecordingWrites();
    const photos = new PostgresProgressPhotos(database.client);

    // act
    await photos.add(ProgressPhoto.reconstitute(SNAPSHOT));

    // assert
    expect(database.writes).toEqual([
      { kind: "insert", table: clientProgressPhotosTable, row: ROW },
    ]);
  });
});

describe("PostgresProgressPhotos#findById", () => {
  it("rebuilds the photo with its storage reference from its row", async () => {
    // arrange
    const photos = new PostgresProgressPhotos(createDatabaseAnswering([ROW]));

    // act
    const photo = await photos.findById(PHOTO_ID);

    // assert
    expect(photo?.toSnapshot()).toEqual(SNAPSHOT);
  });

  it("answers no photo for an id it does not hold", async () => {
    // arrange
    const photos = new PostgresProgressPhotos(createDatabaseAnswering([]));

    // act
    const photo = await photos.findById(PHOTO_ID);

    // assert
    expect(photo).toBeNull();
  });
});

describe("PostgresProgressPhotos#delete", () => {
  it("deletes only the record of that photo", async () => {
    // arrange
    const database = createDatabaseRecordingWrites();
    const photos = new PostgresProgressPhotos(database.client);

    // act
    await photos.delete(PHOTO_ID);

    // assert
    expect(database.writes).toEqual([
      {
        kind: "delete",
        table: clientProgressPhotosTable,
        filter: eq(clientProgressPhotosTable.id, PHOTO_ID),
      },
    ]);
  });
});

function createDatabaseAnswering(rows: readonly unknown[]): DatabaseClient {
  return {
    select: () => ({
      from: () => {
        const selection = {
          where: () => selection,
          limit: () => Promise.resolve(rows),
        };

        return selection;
      },
    }),
  } as unknown as DatabaseClient;
}

function createDatabaseRecordingWrites() {
  const writes: unknown[] = [];
  const client = {
    insert: (table: unknown) => ({
      values: async (row: unknown) => {
        writes.push({ kind: "insert", table, row });
      },
    }),
    delete: (table: unknown) => ({
      where: async (filter: unknown) => {
        writes.push({ kind: "delete", table, filter });
      },
    }),
  } as unknown as DatabaseClient;

  return { client, writes };
}
