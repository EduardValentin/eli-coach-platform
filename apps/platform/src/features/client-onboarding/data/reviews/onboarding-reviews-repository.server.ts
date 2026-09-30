import {
  isCausedByDatabaseError,
  type DatabaseClient,
  type DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  DetailRequest,
  ONBOARDING_FORM_IDS,
  type OnboardingAnswersByForm,
  type OnboardingReviews,
  type ReviewStamps,
} from "@eli-coach-platform/domain/client-onboarding";
import { and, asc, eq, isNull, sql, type SQL } from "drizzle-orm";

import { saveClientProfile } from "~/features/client-onboarding/data/profiles/client-profiles-repository.server";
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

type RecordDetailRequest = Parameters<OnboardingReviews["recordRequest"]>[0];

type RecordDetailsAnswer = Parameters<OnboardingReviews["recordAnswer"]>[0];

type ReviewStampProjection = {
  clientId: string;
  stamps: ReviewStamps;
};

export type ReviewStampWriter = (
  transaction: DatabaseTransaction,
  projection: ReviewStampProjection,
) => Promise<void>;

type OnboardingReviewsOptions = {
  database: DatabaseClient;
  reviewStampWriter: ReviewStampWriter;
};

export class PostgresOnboardingReviews implements OnboardingReviews {
  private readonly database: DatabaseClient;
  private readonly reviewStampWriter: ReviewStampWriter;

  constructor(options: OnboardingReviewsOptions) {
    this.database = options.database;
    this.reviewStampWriter = options.reviewStampWriter;
  }

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

  async recordOpened({ clientId, at, stamps }: ReviewMoment): Promise<void> {
    await this.writeWithStamps({ clientId, stamps }, (transaction) =>
      transaction
        .insert(clientOnboardingReviewsTable)
        .values({ clientId, openedAt: at, approvedAt: null })
        .onConflictDoUpdate({
          target: clientOnboardingReviewsTable.clientId,
          set: {
            openedAt: sql`coalesce(${clientOnboardingReviewsTable.openedAt}, excluded.opened_at)`,
          },
        }),
    );
  }

  async recordRequest({
    request,
    stamps,
  }: RecordDetailRequest): Promise<"recorded" | "already-open"> {
    const snapshot = request.toSnapshot();

    try {
      await this.writeWithStamps(
        { clientId: snapshot.clientId, stamps },
        (transaction) =>
          transaction.insert(clientOnboardingDetailRequestsTable).values({
            id: snapshot.id,
            clientId: snapshot.clientId,
            questionIds: [...snapshot.questionIds],
            note: snapshot.note,
            askedAt: snapshot.askedAt,
            answeredAt: snapshot.answeredAt,
          }),
      );

      return "recorded";
    } catch (error) {
      if (violatesOpenDetailRequestPerClient(error)) {
        return "already-open";
      }

      throw error;
    }
  }

  async recordAnswer(input: RecordDetailsAnswer): Promise<void> {
    const projection = { clientId: input.clientId, stamps: input.stamps };

    await this.writeWithStamps(projection, async (transaction) => {
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
      await saveClientProfile(transaction, input.profile);
    });
  }

  async recordApproval({ clientId, at, stamps }: ReviewMoment): Promise<void> {
    await this.writeWithStamps({ clientId, stamps }, (transaction) =>
      transaction
        .insert(clientOnboardingReviewsTable)
        .values({ clientId, openedAt: at, approvedAt: at })
        .onConflictDoUpdate({
          target: clientOnboardingReviewsTable.clientId,
          set: {
            approvedAt: sql`coalesce(${clientOnboardingReviewsTable.approvedAt}, excluded.approved_at)`,
          },
        }),
    );
  }

  private async writeWithStamps(
    projection: ReviewStampProjection,
    writeRows: (transaction: DatabaseTransaction) => Promise<unknown>,
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await writeRows(transaction);
      await this.reviewStampWriter(transaction, projection);
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
