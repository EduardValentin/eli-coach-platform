import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import type {
  ClientIdentityChanges,
  ClientIdentityEdit,
} from "~/bounded-contexts/clients/clients/domain/client";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

export class PostgresClientIdentityChanges implements ClientIdentityChanges {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async save(edit: ClientIdentityEdit): Promise<void> {
    const { clientId, ...identity } = edit.toSnapshot();

    await this.executor
      .update(clientsTable)
      .set(identity)
      .where(eq(clientsTable.id, clientId));
  }
}
