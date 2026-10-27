import { Account, type Accounts } from "@eli-coach-platform/domain/account";
import type { DatabaseClient } from "~/shared/database";
import { and, eq, isNull, sql } from "drizzle-orm";
import { accountsTable } from "./schema.server";

export class PostgresAccountRepository implements Accounts {
  constructor(private readonly database: DatabaseClient) {}

  async findByAuthSubjectId(authSubjectId: string): Promise<Account | null> {
    const [row] = await this.database
      .select({
        id: accountsTable.id,
        authSubjectId: accountsTable.authSubjectId,
        role: accountsTable.role,
        deletedAt: accountsTable.deletedAt,
      })
      .from(accountsTable)
      .where(eq(accountsTable.authSubjectId, authSubjectId));

    return row ? Account.reconstitute(row) : null;
  }

  async insert(account: Account): Promise<void> {
    await this.database.insert(accountsTable).values(account.toSnapshot());
  }

  async softDeleteByAuthSubjectId(authSubjectId: string): Promise<void> {
    await this.database
      .update(accountsTable)
      .set({ deletedAt: sql`now()` })
      .where(
        and(
          eq(accountsTable.authSubjectId, authSubjectId),
          isNull(accountsTable.deletedAt),
        ),
      );
  }
}
