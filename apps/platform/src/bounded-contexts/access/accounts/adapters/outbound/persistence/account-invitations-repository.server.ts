import {
  AccountInvitation,
  type AccountInvitations,
} from "~/bounded-contexts/access/accounts/domain/account";
import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import { and, eq, isNull, type SQL } from "drizzle-orm";

import { accountInvitationsTable } from "./schema.server";

type Acceptance = Parameters<AccountInvitations["accept"]>[0];

export class PostgresAccountInvitations implements AccountInvitations {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async allow(invitation: AccountInvitation): Promise<void> {
    const { id, email, role, expiresAt } = invitation.toSnapshot();

    await this.executor
      .insert(accountInvitationsTable)
      .values({ id, email, role, expiresAt })
      .onConflictDoUpdate({
        target: accountInvitationsTable.id,
        set: { email, role, expiresAt },
      });
  }

  findById(invitationId: string): Promise<AccountInvitation | null> {
    return this.findOneWhere(eq(accountInvitationsTable.id, invitationId));
  }

  findAcceptedBy(authSubjectId: string): Promise<AccountInvitation | null> {
    return this.findOneWhere(
      eq(accountInvitationsTable.acceptedByAuthSubjectId, authSubjectId),
    );
  }

  async accept(acceptance: Acceptance): Promise<"accepted" | "raced"> {
    const accepted = await this.executor
      .update(accountInvitationsTable)
      .set({
        acceptedByAuthSubjectId: acceptance.authSubjectId,
        acceptedAt: acceptance.at,
      })
      .where(
        and(
          eq(accountInvitationsTable.id, acceptance.invitationId),
          isNull(accountInvitationsTable.acceptedAt),
        ),
      )
      .returning({ id: accountInvitationsTable.id });

    return accepted.length > 0 ? "accepted" : "raced";
  }

  private async findOneWhere(
    condition: SQL,
  ): Promise<AccountInvitation | null> {
    const [row] = await this.executor
      .select({
        id: accountInvitationsTable.id,
        email: accountInvitationsTable.email,
        role: accountInvitationsTable.role,
        expiresAt: accountInvitationsTable.expiresAt,
        acceptedByAuthSubjectId:
          accountInvitationsTable.acceptedByAuthSubjectId,
        acceptedAt: accountInvitationsTable.acceptedAt,
      })
      .from(accountInvitationsTable)
      .where(condition)
      .limit(1);

    return row ? AccountInvitation.reconstitute(row) : null;
  }
}
