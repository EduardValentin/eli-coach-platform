import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "~/shared/database";
import { executorOf, inSavepoint } from "~/shared/database/index.server";
import { CoachingStanding } from "~/bounded-contexts/clients/clients/domain/client";
import type {
  InvitedClient,
  InvitedClients,
} from "~/bounded-contexts/clients/clients/domain/client-invitation";
import { and, eq, isNull, type SQL } from "drizzle-orm";

import { coachingStandingColumns } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/coaching-standing-columns.server";
import {
  clientsConstraints,
  clientsTable,
} from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

const UNIQUE_VIOLATION_CODE = "23505";

type Binding = Parameters<InvitedClients["bindAuthSubject"]>[0];

export class PostgresInvitedClients implements InvitedClients {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  findById(clientId: string): Promise<InvitedClient | null> {
    return this.findOneWhere(eq(clientsTable.id, clientId));
  }

  findByAccountInvitationId(
    invitationId: string,
  ): Promise<InvitedClient | null> {
    return this.findOneWhere(
      eq(clientsTable.accountInvitationId, invitationId),
    );
  }

  async recordAccountInvitation(reference: {
    clientId: string;
    invitationId: string;
  }): Promise<void> {
    await this.executor
      .update(clientsTable)
      .set({ accountInvitationId: reference.invitationId })
      .where(eq(clientsTable.id, reference.clientId));
  }

  async bindAuthSubject(binding: Binding): Promise<"bound" | "raced"> {
    return inSavepoint(this.executor, async (savepoint) => {
      const bound = await savepoint
        .update(clientsTable)
        .set({ authSubjectId: binding.authSubjectId })
        .where(
          and(
            eq(clientsTable.id, binding.clientId),
            isNull(clientsTable.authSubjectId),
          ),
        )
        .returning({ id: clientsTable.id });

      return bound.length > 0 ? ("bound" as const) : ("raced" as const);
    }).catch((error: unknown) => this.racedWhenSubjectAlreadyBound(error));
  }

  private async findOneWhere(condition: SQL): Promise<InvitedClient | null> {
    const [row] = await this.executor
      .select({
        id: clientsTable.id,
        email: clientsTable.email,
        firstName: clientsTable.firstName,
        authSubjectId: clientsTable.authSubjectId,
        accountInvitationId: clientsTable.accountInvitationId,
        standing: coachingStandingColumns,
      })
      .from(clientsTable)
      .where(condition)
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      authSubjectId: row.authSubjectId,
      accountInvitationId: row.accountInvitationId,
      coachingCancelledOrEnded: CoachingStanding.of(
        row.standing,
      ).isCancelledOrEnded(),
    };
  }

  private racedWhenSubjectAlreadyBound(error: unknown): "raced" {
    const subjectAlreadyBound = isCausedByDatabaseError(
      error,
      (fields) =>
        fields.code === UNIQUE_VIOLATION_CODE &&
        fields.constraint === clientsConstraints.clientPerAuthSubject,
    );

    if (!subjectAlreadyBound) {
      throw error;
    }

    return "raced";
  }
}
