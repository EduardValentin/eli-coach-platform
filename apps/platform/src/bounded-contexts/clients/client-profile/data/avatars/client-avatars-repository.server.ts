import type { DatabaseClient } from "~/shared/database";
import {
  ClientAvatar,
  type ClientAvatars,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { eq, inArray } from "drizzle-orm";

import { clientAvatarsTable } from "~/bounded-contexts/clients/client-profile/data/schema.server";

const AVATAR_COLUMNS = {
  clientId: clientAvatarsTable.clientId,
  avatarId: clientAvatarsTable.avatarId,
  storageKey: clientAvatarsTable.storageKey,
  keyId: clientAvatarsTable.keyId,
  mimeType: clientAvatarsTable.mimeType,
  sizeBytes: clientAvatarsTable.sizeBytes,
  updatedAt: clientAvatarsTable.updatedAt,
};

type AvatarRow = typeof clientAvatarsTable.$inferSelect;

export class PostgresClientAvatars implements ClientAvatars {
  constructor(private readonly database: DatabaseClient) {}

  async findByClientId(clientId: string): Promise<ClientAvatar | null> {
    const [row] = await this.database
      .select(AVATAR_COLUMNS)
      .from(clientAvatarsTable)
      .where(eq(clientAvatarsTable.clientId, clientId))
      .limit(1);

    return row ? this.avatarOf(row) : null;
  }

  async findByClientIds(clientIds: readonly string[]): Promise<ClientAvatar[]> {
    if (clientIds.length === 0) {
      return [];
    }

    const rows = await this.database
      .select(AVATAR_COLUMNS)
      .from(clientAvatarsTable)
      .where(inArray(clientAvatarsTable.clientId, [...clientIds]));

    return rows.map((row) => this.avatarOf(row));
  }

  async save(avatar: ClientAvatar): Promise<void> {
    const { reference, ...snapshot } = avatar.toSnapshot();
    const { clientId: _clientId, ...replaced } = { ...snapshot, ...reference };

    await this.database
      .insert(clientAvatarsTable)
      .values({ ...snapshot, ...reference })
      .onConflictDoUpdate({
        target: clientAvatarsTable.clientId,
        set: replaced,
      });
  }

  async remove(clientId: string): Promise<void> {
    await this.database
      .delete(clientAvatarsTable)
      .where(eq(clientAvatarsTable.clientId, clientId));
  }

  private avatarOf(row: AvatarRow): ClientAvatar {
    const { storageKey, keyId, ...avatar } = row;

    return ClientAvatar.reconstitute({
      ...avatar,
      reference: { storageKey, keyId },
    });
  }
}
