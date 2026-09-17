import {
  Account,
  type Accounts,
  type AccountRole,
} from "@eli-coach-platform/domain/account";
import type { DatabaseClient } from "@eli-coach-platform/db";
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

  async insert(input: {
    authSubjectId: string;
    role: AccountRole;
  }): Promise<Account> {
    const [row] = await this.database
      .insert(accountsTable)
      .values({
        authSubjectId: input.authSubjectId,
        role: input.role,
      })
      .returning({
        id: accountsTable.id,
        authSubjectId: accountsTable.authSubjectId,
        role: accountsTable.role,
        deletedAt: accountsTable.deletedAt,
      });

    if (!row) {
      throw new Error("Account insert returned no row.");
    }

    return Account.reconstitute(row);
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
