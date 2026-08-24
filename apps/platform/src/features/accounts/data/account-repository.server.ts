import { eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  AccountRepository,
  AccountRole,
  AccountSnapshot,
  DeletableAccountRepository,
  ProvisionAccountCommand,
} from "@eli-coach-platform/domain";

import { accountsTable } from "./schema.server";

export class PostgresAccountRepository
  implements AccountRepository, DeletableAccountRepository
{
  constructor(private readonly databaseClient: DatabaseClient) {}

  /** The conflict arm writes only `updated_at`: a returning account keeps its role. */
  async provisionByAuthSubjectId(
    command: ProvisionAccountCommand,
  ): Promise<AccountSnapshot> {
    const [row] = await this.databaseClient
      .insert(accountsTable)
      .values({
        authSubjectId: command.authSubjectId,
        role: command.roleWhenNew,
      })
      .onConflictDoUpdate({
        target: accountsTable.authSubjectId,
        set: { updatedAt: sql`now()` },
      })
      .returning({
        id: accountsTable.id,
        role: accountsTable.role,
        deleted: accountsTable.deleted,
      });

    if (!row) {
      throw new Error("Account provisioning returned no row.");
    }

    return toSnapshot(row);
  }

  async markDeletedByAuthSubjectId(authSubjectId: string): Promise<void> {
    await this.databaseClient
      .update(accountsTable)
      .set({ deleted: true, updatedAt: sql`now()` })
      .where(eq(accountsTable.authSubjectId, authSubjectId));
  }
}

type AccountRow = {
  id: string;
  role: string;
  deleted: boolean;
};

function toSnapshot(row: AccountRow): AccountSnapshot {
  return {
    id: row.id,
    role: row.role as AccountRole,
    deleted: row.deleted,
  };
}
