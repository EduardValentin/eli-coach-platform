import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  ClientIdentities,
  ClientIdentity,
} from "@eli-coach-platform/domain/client";
import { eq, inArray } from "drizzle-orm";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

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

export class PostgresClientIdentities implements ClientIdentities {
  constructor(private readonly database: DatabaseClient) {}

  async findByClientId(clientId: string): Promise<ClientIdentity | null> {
    const [row] = await this.database
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

    return this.database
      .select(IDENTITY_COLUMNS)
      .from(clientsTable)
      .where(inArray(clientsTable.id, [...clientIds]));
  }
}
