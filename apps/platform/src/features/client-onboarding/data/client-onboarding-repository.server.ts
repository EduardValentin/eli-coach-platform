import { and, eq, isNull } from "drizzle-orm";

import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  ClientOnboardingRepository,
  OnboardClientCommand,
  OnboardClientOutcome,
} from "@eli-coach-platform/domain";

import {
  accountsTable,
  profilesTable,
} from "~/features/accounts/data/schema.server";

import {
  clientGoalsTable,
  clientInvitationsTable,
  clientMeasurementsTable,
  clientsTable,
  nutritionTargetsTable,
} from "./schema.server";

type PersistCommand = OnboardClientCommand & {
  basalMetabolicRate: number;
  expiresAt: Date;
  payloadDigest: string;
  tokenHash: string;
  totalDailyEnergyExpenditure: number;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class PostgresClientOnboardingRepository
  implements ClientOnboardingRepository
{
  constructor(private readonly database: DatabaseClient) {}

  async onboardClient(command: PersistCommand): Promise<OnboardClientOutcome> {
    const normalizedEmail = normalizeEmail(command.email);

    return this.database.transaction(async (transaction) => {
      const [replay] = await transaction
        .select({
          clientId: clientInvitationsTable.clientId,
          expiresAt: clientInvitationsTable.expiresAt,
          payloadDigest: clientInvitationsTable.payloadDigest,
          profileId: clientsTable.profileId,
        })
        .from(clientInvitationsTable)
        .innerJoin(
          clientsTable,
          eq(clientsTable.id, clientInvitationsTable.clientId),
        )
        .where(
          eq(clientInvitationsTable.idempotencyKey, command.idempotencyKey),
        );

      // Same key, different data is the caller contradicting itself; same key
      // and same data is a retry, which re-issues the link rather than
      // appending a second measurement and a second set of targets.
      if (replay) {
        if (replay.payloadDigest !== command.payloadDigest) {
          return { status: "idempotency_conflict" };
        }

        // The replay mints a fresh link rather than reusing the old one, which
        // is safe only because the send that follows always actually happens —
        // it carries no provider idempotency key. Anything that later suppresses
        // that send would strand the client on a token this hash no longer
        // matches.
        await transaction
          .update(clientInvitationsTable)
          .set({ tokenHash: command.tokenHash, expiresAt: command.expiresAt })
          .where(
            eq(clientInvitationsTable.idempotencyKey, command.idempotencyKey),
          );

        return {
          status: "replayed",
          invitation: {
            clientId: replay.clientId,
            invitationExpiresAt: command.expiresAt,
            profileId: replay.profileId,
            replacedPendingInvitation: false,
          },
        };
      }

      const [existing] = await transaction
        .select({
          clientId: clientsTable.id,
          profileId: clientsTable.profileId,
          accountRole: accountsTable.role,
        })
        .from(clientsTable)
        .innerJoin(profilesTable, eq(profilesTable.id, clientsTable.profileId))
        .leftJoin(accountsTable, eq(accountsTable.id, profilesTable.accountId))
        .where(eq(clientsTable.normalizedEmail, normalizedEmail));

      // Being bound to an account is not itself disqualifying: she may have
      // followed a link and stopped partway, and re-inviting is exactly the
      // recovery for that. Holding the CLIENT role is what means she is
      // already onboarded.
      if (existing?.accountRole === "CLIENT") {
        return { status: "already_a_client" };
      }

      const clientId = existing
        ? await updateExistingClient(transaction, existing, command)
        : await insertNewClient(transaction, command, normalizedEmail);

      const [replacedPending] = await transaction
        .delete(clientInvitationsTable)
        .where(
          and(
            eq(clientInvitationsTable.clientId, clientId),
            isNull(clientInvitationsTable.acceptedAt),
          ),
        )
        .returning({ id: clientInvitationsTable.id });

      await transaction.insert(clientMeasurementsTable).values({
        clientId,
        heightCm: String(command.heightCm),
        weightKg: String(command.weightKg),
        activityLevel: command.activityLevel,
        basalMetabolicRate: command.basalMetabolicRate,
        totalDailyEnergyExpenditure: command.totalDailyEnergyExpenditure,
      });

      // A fresh submission supersedes the standing goal rather than competing
      // with it, which the one-active-goal index would reject anyway.
      await transaction
        .update(clientGoalsTable)
        .set({ status: "COMPLETED", endedOn: today() })
        .where(
          and(
            eq(clientGoalsTable.clientId, clientId),
            eq(clientGoalsTable.status, "ACTIVE"),
          ),
        );

      const [goal] = await transaction
        .insert(clientGoalsTable)
        .values({
          clientId,
          type: command.goalType,
          status: "ACTIVE",
          targetWeightKg: String(command.targetWeightKg),
          startedOn: today(),
        })
        .returning({ id: clientGoalsTable.id });

      await transaction.insert(nutritionTargetsTable).values({
        goalId: goal.id,
        dailyCalories: command.dailyCalories,
        proteinPercent: command.macroSplit.proteinPercent,
        carbsPercent: command.macroSplit.carbsPercent,
        fatsPercent: command.macroSplit.fatsPercent,
      });

      await transaction.insert(clientInvitationsTable).values({
        clientId,
        tokenHash: command.tokenHash,
        idempotencyKey: command.idempotencyKey,
        payloadDigest: command.payloadDigest,
        expiresAt: command.expiresAt,
      });

      const [client] = await transaction
        .select({ profileId: clientsTable.profileId })
        .from(clientsTable)
        .where(eq(clientsTable.id, clientId));

      return {
        status: "onboarded",
        invitation: {
          clientId,
          invitationExpiresAt: command.expiresAt,
          profileId: client.profileId,
          replacedPendingInvitation: Boolean(replacedPending),
        },
      };
    });
  }
}

type Transaction = Parameters<
  Parameters<DatabaseClient["transaction"]>[0]
>[0];

async function insertNewClient(
  transaction: Transaction,
  command: PersistCommand,
  normalizedEmail: string,
): Promise<string> {
  const [profile] = await transaction
    .insert(profilesTable)
    .values({
      firstName: command.firstName,
      lastName: command.lastName,
      dateOfBirth: command.dateOfBirth,
      gender: command.sex,
    })
    .returning({ id: profilesTable.id });

  const [client] = await transaction
    .insert(clientsTable)
    .values({
      profileId: profile.id,
      email: command.email.trim(),
      normalizedEmail,
      dietaryRestrictions: command.dietaryRestrictions,
      coachNotes: command.coachNotes,
    })
    .returning({ id: clientsTable.id });

  return client.id;
}

async function updateExistingClient(
  transaction: Transaction,
  existing: { clientId: string; profileId: string },
  command: PersistCommand,
): Promise<string> {
  await transaction
    .update(profilesTable)
    .set({
      firstName: command.firstName,
      lastName: command.lastName,
      dateOfBirth: command.dateOfBirth,
      gender: command.sex,
      updatedAt: new Date(),
    })
    .where(eq(profilesTable.id, existing.profileId));

  await transaction
    .update(clientsTable)
    .set({
      email: command.email.trim(),
      dietaryRestrictions: command.dietaryRestrictions,
      coachNotes: command.coachNotes,
      updatedAt: new Date(),
    })
    .where(eq(clientsTable.id, existing.clientId));

  return existing.clientId;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
