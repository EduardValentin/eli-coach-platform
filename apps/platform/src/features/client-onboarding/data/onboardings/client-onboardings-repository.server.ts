import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "@eli-coach-platform/db";
import type {
  ClientOnboardingChanges,
  ClientOnboardingSource,
  OnboardingConsents,
  OnboardingDraft,
  OnboardingSubmission,
} from "@eli-coach-platform/domain/client-onboarding";
import type { MeasurementEntry } from "@eli-coach-platform/domain/measurement";
import { eq, sql, type SQL } from "drizzle-orm";

import {
  clientMeasurementsTable,
  clientOnboardingConstraints,
  clientOnboardingDraftsTable,
  clientOnboardingSubmissionsTable,
} from "~/features/client-onboarding/data/schema.server";

const UNIQUE_VIOLATION_CODE = "23505";

type ConsentColumns = {
  specialCategoryConsentedAt: Date | null;
  disclaimerConsentedAt: Date | null;
  progressPhotosConsentedAt: Date | null;
};

export class PostgresClientOnboardings
  implements ClientOnboardingSource, ClientOnboardingChanges
{
  constructor(private readonly database: DatabaseClient) {}

  async findByClientId(clientId: string): Promise<{
    draft: OnboardingDraft | null;
    submission: OnboardingSubmission | null;
  }> {
    const [[draftRow], [submissionRow]] = await Promise.all([
      this.database
        .select({
          answers: clientOnboardingDraftsTable.answers,
          currentFormIndex: clientOnboardingDraftsTable.currentFormIndex,
          specialCategoryConsentedAt:
            clientOnboardingDraftsTable.specialCategoryConsentedAt,
          disclaimerConsentedAt:
            clientOnboardingDraftsTable.disclaimerConsentedAt,
          progressPhotosConsentedAt:
            clientOnboardingDraftsTable.progressPhotosConsentedAt,
          updatedAt: clientOnboardingDraftsTable.updatedAt,
        })
        .from(clientOnboardingDraftsTable)
        .where(eq(clientOnboardingDraftsTable.clientId, clientId))
        .limit(1),
      this.database
        .select({
          answers: clientOnboardingSubmissionsTable.answers,
          specialCategoryConsentedAt:
            clientOnboardingSubmissionsTable.specialCategoryConsentedAt,
          disclaimerConsentedAt:
            clientOnboardingSubmissionsTable.disclaimerConsentedAt,
          progressPhotosConsentedAt:
            clientOnboardingSubmissionsTable.progressPhotosConsentedAt,
          submittedAt: clientOnboardingSubmissionsTable.submittedAt,
        })
        .from(clientOnboardingSubmissionsTable)
        .where(eq(clientOnboardingSubmissionsTable.clientId, clientId))
        .limit(1),
    ]);

    return {
      draft: draftRow
        ? {
            answers: draftRow.answers,
            currentFormIndex: draftRow.currentFormIndex,
            consents: consentsOf(draftRow),
            updatedAt: draftRow.updatedAt,
          }
        : null,
      submission: submissionRow
        ? {
            answers: submissionRow.answers,
            consents: consentsOf(submissionRow),
            submittedAt: submissionRow.submittedAt,
          }
        : null,
    };
  }

  async saveDraft(input: {
    clientId: string;
    draft: OnboardingDraft;
  }): Promise<"saved" | "already-submitted"> {
    const { draft } = input;
    const written = await this.database
      .insert(clientOnboardingDraftsTable)
      .select(draftRowWhileUnsubmitted(input))
      .onConflictDoUpdate({
        target: clientOnboardingDraftsTable.clientId,
        set: {
          answers: draft.answers,
          currentFormIndex: draft.currentFormIndex,
          ...consentColumnsOf(draft.consents),
          updatedAt: draft.updatedAt,
        },
      })
      .returning({ clientId: clientOnboardingDraftsTable.clientId });

    return written.length > 0 ? "saved" : "already-submitted";
  }

  async recordSubmission(input: {
    clientId: string;
    submission: OnboardingSubmission;
    measurementEntry: MeasurementEntry;
  }): Promise<"recorded" | "already-submitted"> {
    const { clientId, measurementEntry, submission } = input;

    try {
      await this.database.transaction(async (transaction) => {
        await transaction.insert(clientOnboardingSubmissionsTable).values({
          clientId,
          answers: submission.answers,
          ...consentColumnsOf(submission.consents),
          submittedAt: submission.submittedAt,
        });
        await transaction.insert(clientMeasurementsTable).values({
          clientId,
          recordedAt: measurementEntry.recordedAt,
          weightKg: measurementEntry.weightKg,
          waistCm: measurementEntry.waistCm,
          hipsCm: measurementEntry.hipsCm ?? null,
          thighCm: measurementEntry.thighCm ?? null,
          armCm: measurementEntry.armCm ?? null,
        });
        await transaction
          .delete(clientOnboardingDraftsTable)
          .where(eq(clientOnboardingDraftsTable.clientId, clientId));
      });

      return "recorded";
    } catch (error) {
      if (violatesSubmissionPerClient(error)) {
        return "already-submitted";
      }

      throw error;
    }
  }
}

function draftRowWhileUnsubmitted(input: {
  clientId: string;
  draft: OnboardingDraft;
}): SQL {
  const { clientId, draft } = input;
  const consents = consentColumnsOf(draft.consents);

  return sql`select ${clientId}::uuid, ${JSON.stringify(draft.answers)}::jsonb, ${draft.currentFormIndex}::integer, ${consents.specialCategoryConsentedAt}::timestamptz, ${consents.disclaimerConsentedAt}::timestamptz, ${consents.progressPhotosConsentedAt}::timestamptz, ${draft.updatedAt}::timestamptz where not exists (select 1 from ${clientOnboardingSubmissionsTable} where ${clientOnboardingSubmissionsTable.clientId} = ${clientId})`;
}

function consentColumnsOf(consents: OnboardingConsents): ConsentColumns {
  return {
    specialCategoryConsentedAt: consents.specialCategoryAt,
    disclaimerConsentedAt: consents.disclaimerAt,
    progressPhotosConsentedAt: consents.progressPhotosAt,
  };
}

function consentsOf(columns: ConsentColumns): OnboardingConsents {
  return {
    specialCategoryAt: columns.specialCategoryConsentedAt,
    disclaimerAt: columns.disclaimerConsentedAt,
    progressPhotosAt: columns.progressPhotosConsentedAt,
  };
}

function violatesSubmissionPerClient(error: unknown): boolean {
  return isCausedByDatabaseError(
    error,
    (fields) =>
      fields.code === UNIQUE_VIOLATION_CODE &&
      fields.constraint === clientOnboardingConstraints.submissionPerClient,
  );
}
