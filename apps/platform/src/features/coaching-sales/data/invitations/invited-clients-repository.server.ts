import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  InvitedClient,
  InvitedClients,
} from "@eli-coach-platform/domain/client-invitation";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

export class PostgresInvitedClients implements InvitedClients {
  constructor(private readonly database: DatabaseClient) {}

  async findById(clientId: string): Promise<InvitedClient | null> {
    const [row] = await this.database
      .select({
        id: clientsTable.id,
        email: clientsTable.email,
        firstName: clientsTable.firstName,
        authSubjectId: clientsTable.authSubjectId,
      })
      .from(clientsTable)
      .where(eq(clientsTable.id, clientId))
      .limit(1);

    return row ?? null;
  }
}
