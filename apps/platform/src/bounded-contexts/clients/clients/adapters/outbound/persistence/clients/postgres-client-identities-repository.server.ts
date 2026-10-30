import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "~/bounded-contexts/clients/clients/domain/client";
import { eq, inArray } from "drizzle-orm";

import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

const IDENTITY_COLUMNS = {
  clientId: clientsTable.id,
  firstName: clientsTable.firstName,
  lastName: clientsTable.lastName,
  email: clientsTable.email,
  dateOfBirth: clientsTable.dateOfBirth,
  gender: clientsTable.gender,
  country: clientsTable.country,
  phone: clientsTable.phone,
};

export class PostgresClientIdentitiesRepository implements ClientIdentitiesPort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async findByClientId(clientId: string): Promise<ClientIdentity | null> {
    const [row] = await this.executor
      .select(IDENTITY_COLUMNS)
      .from(clientsTable)
      .where(eq(clientsTable.id, clientId))
      .limit(1);

    return row ?? null;
  }

  async findByClientIds(
    clientIds: readonly string[],
  ): Promise<ClientIdentity[]> {
    if (clientIds.length === 0) {
      return [];
    }

    return this.executor
      .select(IDENTITY_COLUMNS)
      .from(clientsTable)
      .where(inArray(clientsTable.id, [...clientIds]));
  }
}
