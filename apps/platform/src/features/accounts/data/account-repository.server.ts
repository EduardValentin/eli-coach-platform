import { sql } from "drizzle-orm";

import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  AccountRepository,
  AccountRole,
  AccountSnapshot,
  ProvisionAccountCommand,
} from "@eli-coach-platform/domain";

import { accountsTable } from "./schema.server";

export class PostgresAccountRepository implements AccountRepository {
  constructor(private readonly databaseClient: DatabaseClient) {}

  /**
   * One statement, so two tabs finishing sign-in at the same moment cannot both
   * decide the account is missing. The conflict arm deliberately writes only
   * `updated_at`: a returning account keeps whatever role it was promoted to.
   */
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
        authSubjectId: accountsTable.authSubjectId,
        role: accountsTable.role,
        deleted: accountsTable.deleted,
      });

    if (!row) {
      throw new Error("Account provisioning returned no row.");
    }

    return toSnapshot(row);
  }

}

type AccountRow = {
  id: string;
  authSubjectId: string | null;
  role: string;
  deleted: boolean;
};

function toSnapshot(row: AccountRow): AccountSnapshot {
  return {
    id: row.id,
    authSubjectId: row.authSubjectId,
    role: row.role as AccountRole,
    deleted: row.deleted,
  };
}
