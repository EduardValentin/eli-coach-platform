import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "~/shared/database";
import { createUnitOfWork, executorOf } from "~/shared/database/index.server";
import {
  DetailRequest,
  ONBOARDING_FORM_IDS,
  type OnboardingAnswersByForm,
  type OnboardingReviewStampsPort,
  type OnboardingReviewsPort,
  type ReviewStamps,
} from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import { and, asc, eq, isNull, sql, type SQL } from "drizzle-orm";

import type { CoachingSeedWriter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/onboarding/client-profile-writer-ports.server";
import {
  clientOnboardingConstraints,
  clientOnboardingDetailRequestsTable,
  clientOnboardingReviewsTable,
  clientOnboardingSubmissionsTable,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/schema.server";

const UNIQUE_VIOLATION_CODE = "23505";

type StoredOnboardingReview = Awaited<
  ReturnType<OnboardingReviewsPort["findByClientId"]>
>;

type ReviewMoment = Parameters<OnboardingReviewsPort["recordOpened"]>[0];

type RecordDetailRequest = Parameters<
  OnboardingReviewsPort["recordRequest"]
>[0];

type RecordDetailsAnswer = Parameters<OnboardingReviewsPort["recordAnswer"]>[0];

type RecordApproval = Parameters<OnboardingReviewsPort["recordApproval"]>[0];

type ReviewStampProjection = {
  clientId: string;
  stamps: ReviewStamps;
};

type OnboardingReviewsOptions = {
  database: DatabaseClient;
  onboardingReviewStampsPort: OnboardingReviewStampsPort;
  coachingSeedWriter: CoachingSeedWriter;
};

export class PostgresOnboardingReviewsRepository implements OnboardingReviewsPort {
  private readonly database: DatabaseClient;
  private readonly onboardingReviewStampsPort: OnboardingReviewStampsPort;
  private readonly coachingSeedWriter: CoachingSeedWriter;

  constructor(options: OnboardingReviewsOptions) {
    this.database = options.database;
    this.onboardingReviewStampsPort = options.onboardingReviewStampsPort;
    this.coachingSeedWriter = options.coachingSeedWriter;
  }

  private get executor() {
    return executorOf(this.database);
  }

  async findByClientId(clientId: string): Promise<StoredOnboardingReview> {
    const [[review], requestRows] = await Promise.all([
      this.executor
        .select({
          openedAt: clientOnboardingReviewsTable.openedAt,
          approvedAt: clientOnboardingReviewsTable.approvedAt,
        })
        .from(clientOnboardingReviewsTable)
        .where(eq(clientOnboardingReviewsTable.clientId, clientId))
        .limit(1),
      this.executor
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
    await this.writeWithStamps({ clientId, stamps }, () =>
      this.executor
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
      await this.writeWithStamps({ clientId: snapshot.clientId, stamps }, () =>
        this.executor.insert(clientOnboardingDetailRequestsTable).values({
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

    await this.writeWithStamps(projection, async () => {
      const answered = await this.executor
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

      await this.executor
        .update(clientOnboardingSubmissionsTable)
        .set({ answers: mergedAnswersExpression(input.mergedAnswers) })
        .where(eq(clientOnboardingSubmissionsTable.clientId, input.clientId));
    });
  }

  async recordApproval({
    clientId,
    at,
    stamps,
    seed,
  }: RecordApproval): Promise<void> {
    await this.writeWithStamps({ clientId, stamps }, async () => {
      await this.executor
        .insert(clientOnboardingReviewsTable)
        .values({ clientId, openedAt: at, approvedAt: at })
        .onConflictDoUpdate({
          target: clientOnboardingReviewsTable.clientId,
          set: {
            approvedAt: sql`coalesce(${clientOnboardingReviewsTable.approvedAt}, excluded.approved_at)`,
          },
        });
      await this.coachingSeedWriter({ clientId, seed, at });
    });
  }

  private async writeWithStamps(
    projection: ReviewStampProjection,
    writeRows: () => Promise<unknown>,
  ): Promise<void> {
    await createUnitOfWork(this.database)(async () => {
      await writeRows();
      await this.onboardingReviewStampsPort.record(projection);
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
