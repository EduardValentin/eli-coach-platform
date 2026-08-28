import type { Account, AccountRepository, AccountRole } from "@eli-coach-platform/domain";
import type { DatabaseClient } from "@eli-coach-platform/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { accountsTable } from "./schema.server";

type AccountRow = {
  id: string;
  authSubjectId: string;
  role: string;
  deletedAt: Date | null;
};

export class PostgresAccountRepository implements AccountRepository {
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

    return row ? mapAccount(row) : null;
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

    return mapAccount(row);
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

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    authSubjectId: row.authSubjectId,
    // Safe because `accounts_role_check` (schema.server.ts) constrains the
    // column to exactly the three AccountRole values; Drizzle types the
    // column as plain text, so the narrowing has to be stated here.
    role: row.role as AccountRole,
    deletedAt: row.deletedAt,
  };
}
