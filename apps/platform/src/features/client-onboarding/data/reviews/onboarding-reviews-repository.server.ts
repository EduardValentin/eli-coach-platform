import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "@eli-coach-platform/db";
import {
  DetailRequest,
  ONBOARDING_FORM_IDS,
  type OnboardingAnswersByForm,
  type OnboardingReviews,
} from "@eli-coach-platform/domain/client-onboarding";
import { and, asc, eq, isNull, sql, type SQL } from "drizzle-orm";

import {
  clientOnboardingConstraints,
  clientOnboardingDetailRequestsTable,
  clientOnboardingReviewsTable,
  clientOnboardingSubmissionsTable,
} from "~/features/client-onboarding/data/schema.server";

const UNIQUE_VIOLATION_CODE = "23505";

type StoredOnboardingReview = Awaited<
  ReturnType<OnboardingReviews["findByClientId"]>
>;

type ReviewMoment = Parameters<OnboardingReviews["recordOpened"]>[0];

type RecordDetailsAnswer = Parameters<OnboardingReviews["recordAnswer"]>[0];

export class PostgresOnboardingReviews implements OnboardingReviews {
  constructor(private readonly database: DatabaseClient) {}

  async findByClientId(clientId: string): Promise<StoredOnboardingReview> {
    const [[review], requestRows] = await Promise.all([
      this.database
        .select({
          openedAt: clientOnboardingReviewsTable.openedAt,
          approvedAt: clientOnboardingReviewsTable.approvedAt,
        })
        .from(clientOnboardingReviewsTable)
        .where(eq(clientOnboardingReviewsTable.clientId, clientId))
        .limit(1),
      this.database
        .select({
          id: clientOnboardingDetailRequestsTable.id,
          clientId: clientOnboardingDetailRequestsTable.clientId,
          questionIds: clientOnboardingDetailRequestsTable.questionIds,
          note: clientOnboardingDetailRequestsTable.note,
          askedAt: clientOnboardingDetailRequestsTable.askedAt,
          answeredAt: clientOnboardingDetailRequestsTable.answeredAt,
        })
        .from(clientOnboardingDetailRequestsTable)
        .where(eq(clientOnboardingDetailRequestsTable.clientId, clientId))
        .orderBy(asc(clientOnboardingDetailRequestsTable.askedAt)),
    ]);

    return {
      openedAt: review?.openedAt ?? null,
      approvedAt: review?.approvedAt ?? null,
      requests: requestRows.map((row) => DetailRequest.reconstitute(row)),
    };
  }

  async recordOpened({ clientId, at }: ReviewMoment): Promise<void> {
    await this.database
      .insert(clientOnboardingReviewsTable)
      .values({ clientId, openedAt: at, approvedAt: null })
      .onConflictDoUpdate({
        target: clientOnboardingReviewsTable.clientId,
        set: {
          openedAt: sql`coalesce(${clientOnboardingReviewsTable.openedAt}, excluded.opened_at)`,
        },
      });
  }

  async recordRequest(
    request: DetailRequest,
  ): Promise<"recorded" | "already-open"> {
    const snapshot = request.toSnapshot();

    try {
      await this.database.insert(clientOnboardingDetailRequestsTable).values({
        id: snapshot.id,
        clientId: snapshot.clientId,
        questionIds: [...snapshot.questionIds],
        note: snapshot.note,
        askedAt: snapshot.askedAt,
        answeredAt: snapshot.answeredAt,
      });

      return "recorded";
    } catch (error) {
      if (violatesOpenDetailRequestPerClient(error)) {
        return "already-open";
      }

      throw error;
    }
  }

  async recordAnswer(input: RecordDetailsAnswer): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const answered = await transaction
        .update(clientOnboardingDetailRequestsTable)
        .set({ answeredAt: input.answeredAt })
        .where(
          and(
            eq(clientOnboardingDetailRequestsTable.id, input.requestId),
            eq(clientOnboardingDetailRequestsTable.clientId, input.clientId),
            isNull(clientOnboardingDetailRequestsTable.answeredAt),
          ),
        )
        .returning({ id: clientOnboardingDetailRequestsTable.id });

      if (answered.length === 0) {
        throw new Error("The detail request is no longer open.");
      }

      await transaction
        .update(clientOnboardingSubmissionsTable)
        .set({ answers: mergedAnswersExpression(input.mergedAnswers) })
        .where(eq(clientOnboardingSubmissionsTable.clientId, input.clientId));
    });
  }

  async recordApproval({ clientId, at }: ReviewMoment): Promise<void> {
    await this.database
      .insert(clientOnboardingReviewsTable)
      .values({ clientId, openedAt: at, approvedAt: at })
      .onConflictDoUpdate({
        target: clientOnboardingReviewsTable.clientId,
        set: {
          approvedAt: sql`coalesce(${clientOnboardingReviewsTable.approvedAt}, excluded.approved_at)`,
        },
      });
  }
}

function mergedAnswersExpression(merged: OnboardingAnswersByForm): SQL {
  const answers = clientOnboardingSubmissionsTable.answers;

  return ONBOARDING_FORM_IDS.filter(
    (formId) => Object.keys(merged[formId] ?? {}).length > 0,
  ).reduce<SQL>(
    (expression, formId) =>
      sql`jsonb_set(${expression}, array[${formId}]::text[], coalesce(${answers} -> ${formId}, '{}'::jsonb) || ${JSON.stringify(merged[formId])}::jsonb)`,
    sql`${answers}`,
  );
}

function violatesOpenDetailRequestPerClient(error: unknown): boolean {
  return isCausedByDatabaseError(
    error,
    (fields) =>
      fields.code === UNIQUE_VIOLATION_CODE &&
      fields.constraint ===
        clientOnboardingConstraints.openDetailRequestPerClient,
  );
}
