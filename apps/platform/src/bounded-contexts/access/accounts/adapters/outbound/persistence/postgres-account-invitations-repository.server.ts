import {
  AccountInvitation,
  type AccountInvitationsPort,
  type IdentityInvitation,
} from "~/bounded-contexts/access/accounts/domain/account";
import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import { and, eq, isNull, type SQL } from "drizzle-orm";

import { accountInvitationsTable } from "./schema.server";

type AccountInvitationRow = typeof accountInvitationsTable.$inferSelect;

type Acceptance = Parameters<AccountInvitationsPort["accept"]>[0];

export class PostgresAccountInvitationsRepository implements AccountInvitationsPort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  findById(invitationId: string): Promise<AccountInvitation | null> {
    return this.findOneWhere(eq(accountInvitationsTable.id, invitationId));
  }

  findByTokenHash(tokenHash: string): Promise<AccountInvitation | null> {
    return this.findOneWhere(eq(accountInvitationsTable.tokenHash, tokenHash));
  }

  findAcceptedBy(authSubjectId: string): Promise<AccountInvitation | null> {
    return this.findOneWhere(
      eq(accountInvitationsTable.acceptedByAuthSubjectId, authSubjectId),
    );
  }

  async insert(invitation: AccountInvitation): Promise<void> {
    await this.executor.insert(accountInvitationsTable).values({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      tokenHash: invitation.tokenHash,
      sentAt: invitation.sentAt,
      expiresAt: invitation.expiresAt,
      providerInvitationId: invitation.provider?.id ?? null,
      providerInvitationUrl: invitation.provider?.url ?? null,
      emailSentAt: invitation.emailSentAt,
      emailDeliveryFailedAt: invitation.emailDeliveryFailedAt,
      acceptedByAuthSubjectId: invitation.acceptedByAuthSubjectId,
      acceptedAt: invitation.acceptedAt,
      createdAt: invitation.sentAt,
    });
  }

  async reissue(invitation: AccountInvitation): Promise<void> {
    await this.executor
      .update(accountInvitationsTable)
      .set({
        tokenHash: invitation.tokenHash,
        sentAt: invitation.sentAt,
        expiresAt: invitation.expiresAt,
        emailSentAt: invitation.emailSentAt,
        emailDeliveryFailedAt: invitation.emailDeliveryFailedAt,
      })
      .where(eq(accountInvitationsTable.id, invitation.id));
  }

  async recordProvider(input: {
    invitationId: string;
    provider: IdentityInvitation;
  }): Promise<void> {
    await this.executor
      .update(accountInvitationsTable)
      .set({
        providerInvitationId: input.provider.id,
        providerInvitationUrl: input.provider.url,
      })
      .where(eq(accountInvitationsTable.id, input.invitationId));
  }

  async recordEmailSent(input: {
    invitationId: string;
    at: Date;
  }): Promise<void> {
    await this.executor
      .update(accountInvitationsTable)
      .set({ emailSentAt: input.at })
      .where(eq(accountInvitationsTable.id, input.invitationId));
  }

  async recordEmailDeliveryFailed(input: {
    invitationId: string;
    at: Date;
  }): Promise<void> {
    await this.executor
      .update(accountInvitationsTable)
      .set({ emailDeliveryFailedAt: input.at })
      .where(eq(accountInvitationsTable.id, input.invitationId));
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
      .select()
      .from(accountInvitationsTable)
      .where(condition)
      .limit(1);

    return row ? this.toAccountInvitation(row) : null;
  }

  private toAccountInvitation(row: AccountInvitationRow): AccountInvitation {
    return AccountInvitation.reconstitute({
      id: row.id,
      email: row.email,
      role: row.role,
      tokenHash: row.tokenHash,
      sentAt: row.sentAt,
      expiresAt: row.expiresAt,
      provider: this.providerOf(row),
      emailSentAt: row.emailSentAt,
      emailDeliveryFailedAt: row.emailDeliveryFailedAt,
      acceptedByAuthSubjectId: row.acceptedByAuthSubjectId,
      acceptedAt: row.acceptedAt,
    });
  }

  private providerOf(row: AccountInvitationRow): IdentityInvitation | null {
    if (!row.providerInvitationId || !row.providerInvitationUrl) {
      return null;
    }

    return { id: row.providerInvitationId, url: row.providerInvitationUrl };
  }
}
