import type { DatabaseClient } from "@eli-coach-platform/db";
import { ClientAvatar } from "@eli-coach-platform/domain/client-profile";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { clientAvatarsTable } from "~/features/client-profile/data/schema.server";

import { PostgresClientAvatars } from "./client-avatars-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const UPLOADED_AT = new Date("2026-10-24T10:00:00.000Z");

const ROW = {
  clientId: CLIENT_ID,
  avatarId: "0b9b6f8e-6d4e-4b7a-9f5b-2f8c1e3d4a5b",
  storageKey: `${CLIENT_ID}/avatar/0b9b6f8e-6d4e-4b7a-9f5b-2f8c1e3d4a5b.bin`,
  keyId: "k1",
  mimeType: "image/jpeg",
  sizeBytes: 2048,
  updatedAt: UPLOADED_AT,
};

const SNAPSHOT = {
  clientId: ROW.clientId,
  avatarId: ROW.avatarId,
  reference: { storageKey: ROW.storageKey, keyId: ROW.keyId },
  mimeType: ROW.mimeType,
  sizeBytes: ROW.sizeBytes,
  updatedAt: UPLOADED_AT,
};

describe("PostgresClientAvatars#findByClientId", () => {
  it("rebuilds her avatar from its row", async () => {
    // arrange
    const avatars = new PostgresClientAvatars(createDatabaseAnswering([ROW]));

    // act
    const avatar = await avatars.findByClientId(CLIENT_ID);

    // assert
    expect(avatar?.toSnapshot()).toEqual(SNAPSHOT);
  });

  it("answers null while she has no avatar", async () => {
    // arrange
    const avatars = new PostgresClientAvatars(createDatabaseAnswering([]));

    // act
    const avatar = await avatars.findByClientId(CLIENT_ID);

    // assert
    expect(avatar).toBeNull();
  });
});

describe("PostgresClientAvatars#findByClientIds", () => {
  it("reads nothing for no clients without querying", async () => {
    // arrange
    const avatars = new PostgresClientAvatars({} as DatabaseClient);

    // act
    const found = await avatars.findByClientIds([]);

    // assert
    expect(found).toEqual([]);
  });

  it("rebuilds the avatars of the clients asked for", async () => {
    // arrange
    const avatars = new PostgresClientAvatars(createDatabaseAnswering([ROW]));

    // act
    const found = await avatars.findByClientIds([CLIENT_ID]);

    // assert
    expect(found.map((avatar) => avatar.toSnapshot())).toEqual([SNAPSHOT]);
  });
});

describe("PostgresClientAvatars#save", () => {
  it("records her avatar, replacing the one she had", async () => {
    // arrange
    const database = createDatabaseRecordingWrites();
    const avatars = new PostgresClientAvatars(database.client);

    // act
    await avatars.save(ClientAvatar.reconstitute(SNAPSHOT));

    // assert
    expect(database.inserted).toEqual([ROW]);
    const { clientId: _clientId, ...replaced } = ROW;
    expect(database.conflictUpdates).toEqual([replaced]);
  });
});

describe("PostgresClientAvatars#remove", () => {
  it("deletes her avatar row", async () => {
    // arrange
    const database = createDatabaseRecordingWrites();
    const avatars = new PostgresClientAvatars(database.client);

    // act
    await avatars.remove(CLIENT_ID);

    // assert
    expect(database.deletes).toEqual([
      {
        table: clientAvatarsTable,
        filter: eq(clientAvatarsTable.clientId, CLIENT_ID),
      },
    ]);
  });
});

function createDatabaseAnswering(rows: readonly unknown[]): DatabaseClient {
  const selection = {
    from: () => selection,
    where: () =>
      Object.assign(Promise.resolve(rows), {
        limit: () => Promise.resolve(rows),
      }),
  };

  return { select: () => selection } as unknown as DatabaseClient;
}

function createDatabaseRecordingWrites() {
  const inserted: unknown[] = [];
  const conflictUpdates: unknown[] = [];
  const deletes: unknown[] = [];
  const client = {
    insert: () => ({
      values: (row: unknown) => {
        inserted.push(row);

        return {
          onConflictDoUpdate: async (config: { set: unknown }) => {
            conflictUpdates.push(config.set);
          },
        };
      },
    }),
    delete: (table: unknown) => ({
      where: async (filter: unknown) => {
        deletes.push({ table, filter });
      },
    }),
  } as unknown as DatabaseClient;

  return { client, conflictUpdates, deletes, inserted };
}
