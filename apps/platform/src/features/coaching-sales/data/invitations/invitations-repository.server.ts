import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  ClientInvitation,
  type ClientInvitations,
  type IdentityInvitation,
} from "@eli-coach-platform/domain/client-invitation";
import { and, eq, isNull, type SQL } from "drizzle-orm";

import {
  clientInvitationsTable,
  clientsTable,
  coachingSalesConstraints,
} from "~/features/coaching-sales/data/schema.server";
import { violatesUniqueConstraint } from "~/features/coaching-sales/data/unique-violation.server";

type ClientInvitationRow = typeof clientInvitationsTable.$inferSelect;

type Acceptance = {
  invitationId: string;
  authSubjectId: string;
  now: Date;
};

export class PostgresClientInvitations implements ClientInvitations {
  constructor(private readonly database: DatabaseClient) {}

  async findById(invitationId: string): Promise<ClientInvitation | null> {
    return this.findOneWhere(eq(clientInvitationsTable.id, invitationId));
  }

  async findByClientId(clientId: string): Promise<ClientInvitation | null> {
    return this.findOneWhere(eq(clientInvitationsTable.clientId, clientId));
  }

  async findByTokenHash(tokenHash: string): Promise<ClientInvitation | null> {
    return this.findOneWhere(eq(clientInvitationsTable.tokenHash, tokenHash));
  }

  async insert(invitation: ClientInvitation): Promise<void> {
    await this.database.insert(clientInvitationsTable).values({
      id: invitation.id,
      clientId: invitation.clientId,
      email: invitation.email,
      tokenHash: invitation.tokenHash,
      sentAt: invitation.sentAt,
      expiresAt: invitation.expiresAt,
      usedAt: invitation.usedAt,
      acceptedByAuthSubjectId: invitation.acceptedByAuthSubjectId,
      providerInvitationId: invitation.provider?.id ?? null,
      providerInvitationUrl: invitation.provider?.url ?? null,
      emailSentAt: invitation.emailSentAt,
      emailDeliveryFailedAt: invitation.emailDeliveryFailedAt,
      createdAt: invitation.sentAt,
    });
  }

  async reissue(invitation: ClientInvitation): Promise<void> {
    await this.database
      .update(clientInvitationsTable)
      .set({
        tokenHash: invitation.tokenHash,
        sentAt: invitation.sentAt,
        expiresAt: invitation.expiresAt,
        emailSentAt: invitation.emailSentAt,
        emailDeliveryFailedAt: invitation.emailDeliveryFailedAt,
      })
      .where(eq(clientInvitationsTable.id, invitation.id));
  }

  async recordProvider(input: {
    invitationId: string;
    provider: IdentityInvitation;
  }): Promise<void> {
    await this.database
      .update(clientInvitationsTable)
      .set({
        providerInvitationId: input.provider.id,
        providerInvitationUrl: input.provider.url,
      })
      .where(eq(clientInvitationsTable.id, input.invitationId));
  }

  async recordEmailSent(input: {
    invitationId: string;
    at: Date;
  }): Promise<void> {
    await this.database
      .update(clientInvitationsTable)
      .set({ emailSentAt: input.at })
      .where(eq(clientInvitationsTable.id, input.invitationId));
  }

  async recordEmailDeliveryFailed(input: {
    invitationId: string;
    at: Date;
  }): Promise<void> {
    await this.database
      .update(clientInvitationsTable)
      .set({ emailDeliveryFailedAt: input.at })
      .where(eq(clientInvitationsTable.id, input.invitationId));
  }

  async accept(acceptance: Acceptance): Promise<"accepted" | "raced"> {
    return this.database
      .transaction((transaction) =>
        acceptAndBindClient(transaction, acceptance),
      )
      .catch(racedWhenSubjectAlreadyBound);
  }

  private async findOneWhere(condition: SQL): Promise<ClientInvitation | null> {
    const [row] = await this.database
      .select()
      .from(clientInvitationsTable)
      .where(condition)
      .limit(1);

    return row ? toClientInvitation(row) : null;
  }
}

async function acceptAndBindClient(
  transaction: DatabaseTransaction,
  acceptance: Acceptance,
): Promise<"accepted" | "raced"> {
  const [accepted] = await transaction
    .update(clientInvitationsTable)
    .set({
      usedAt: acceptance.now,
      acceptedByAuthSubjectId: acceptance.authSubjectId,
    })
    .where(
      and(
        eq(clientInvitationsTable.id, acceptance.invitationId),
        isNull(clientInvitationsTable.usedAt),
      ),
    )
    .returning({ clientId: clientInvitationsTable.clientId });

  if (!accepted) {
    return "raced";
  }

  await transaction
    .update(clientsTable)
    .set({ authSubjectId: acceptance.authSubjectId })
    .where(eq(clientsTable.id, accepted.clientId));

  return "accepted";
}

function racedWhenSubjectAlreadyBound(error: unknown): "raced" {
  if (
    !violatesUniqueConstraint(
      error,
      coachingSalesConstraints.clientPerAuthSubject,
    )
  ) {
    throw error;
  }

  return "raced";
}

function toClientInvitation(row: ClientInvitationRow): ClientInvitation {
  return ClientInvitation.reconstitute({
    id: row.id,
    clientId: row.clientId,
    email: row.email,
    tokenHash: row.tokenHash,
    sentAt: row.sentAt,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    acceptedByAuthSubjectId: row.acceptedByAuthSubjectId,
    provider: toProvider(row),
    emailSentAt: row.emailSentAt,
    emailDeliveryFailedAt: row.emailDeliveryFailedAt,
  });
}

function toProvider(row: ClientInvitationRow): IdentityInvitation | null {
  if (!row.providerInvitationId || !row.providerInvitationUrl) {
    return null;
  }

  return { id: row.providerInvitationId, url: row.providerInvitationUrl };
}
