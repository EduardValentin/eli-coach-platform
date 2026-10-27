import type { DatabaseClient } from "~/shared/database";
import type {
  ClientIdentityChanges,
  ClientIdentityEdit,
} from "@eli-coach-platform/domain/client";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/bounded-contexts/clients/clients/data/schema.server";

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
