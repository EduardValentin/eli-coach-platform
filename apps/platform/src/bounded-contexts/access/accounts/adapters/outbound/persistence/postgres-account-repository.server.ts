import {
  Account,
  type AccountsPort,
} from "~/bounded-contexts/access/accounts/domain/account";
import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { accountsTable } from "./schema.server";

export class PostgresAccountRepository implements AccountsPort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async findByAuthSubjectId(authSubjectId: string): Promise<Account | null> {
    const [row] = await this.executor
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
    await this.executor.insert(accountsTable).values(account.toSnapshot());
  }

  async softDeleteByAuthSubjectId(authSubjectId: string): Promise<void> {
    await this.executor
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
