import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  ClientIdentities,
  ClientIdentity,
} from "@eli-coach-platform/domain/client";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

export class PostgresClientIdentities implements ClientIdentities {
  constructor(private readonly database: DatabaseClient) {}

  async findByClientId(clientId: string): Promise<ClientIdentity | null> {
    const [row] = await this.database
      .select({
        clientId: clientsTable.id,
        firstName: clientsTable.firstName,
        lastName: clientsTable.lastName,
        email: clientsTable.email,
        dateOfBirth: clientsTable.dateOfBirth,
        gender: clientsTable.gender,
        country: clientsTable.country,
        phone: clientsTable.phone,
      })
      .from(clientsTable)
      .where(eq(clientsTable.id, clientId))
      .limit(1);

    return row ?? null;
  }
}
