import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  ClientIdentityChanges,
  ClientIdentityEdit,
} from "@eli-coach-platform/domain/client";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/features/clients/data/schema.server";

export class PostgresClientIdentityChanges implements ClientIdentityChanges {
  constructor(private readonly database: DatabaseClient) {}

  async save(edit: ClientIdentityEdit): Promise<void> {
    const { clientId, ...identity } = edit.toSnapshot();

    await this.database
      .update(clientsTable)
      .set(identity)
      .where(eq(clientsTable.id, clientId));
  }
}
