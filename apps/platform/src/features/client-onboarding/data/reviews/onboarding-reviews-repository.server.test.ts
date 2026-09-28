import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  DetailRequest,
  emptyDraft,
  type OnboardingAnswersByForm,
} from "@eli-coach-platform/domain/client-onboarding";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  clientOnboardingDetailRequestsTable,
  clientOnboardingReviewsTable,
  clientOnboardingSubmissionsTable,
} from "~/features/client-onboarding/data/schema.server";

import { PostgresOnboardingReviews } from "./onboarding-reviews-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const FIRST_REQUEST_ID = "0b5f2f0e-3a1c-4c47-9a57-8f2d7f1e6a01";
const SECOND_REQUEST_ID = "3d9a1c44-5b7e-4f0a-8c21-6e4b9d2f7a02";
const OPENED_AT = new Date("2026-09-29T09:00:00.000Z");
const FIRST_ASKED_AT = new Date("2026-09-29T10:00:00.000Z");
const FIRST_ANSWERED_AT = new Date("2026-09-30T08:00:00.000Z");
const SECOND_ASKED_AT = new Date("2026-10-01T10:00:00.000Z");
const APPROVED_AT = new Date("2026-10-02T09:00:00.000Z");

describe("PostgresOnboardingReviews#findByClientId", () => {
  it("reads the review moments and her requests into one stored review", async () => {
    // arrange
    const reviews = new PostgresOnboardingReviews(
      createDatabaseAnswering({
        reviews: [{ openedAt: OPENED_AT, approvedAt: APPROVED_AT }],
        requests: [
          requestRow({
            id: FIRST_REQUEST_ID,
            askedAt: FIRST_ASKED_AT,
            answeredAt: FIRST_ANSWERED_AT,
          }),
        ],
      }).client,
    );

    // act
    const stored = await reviews.findByClientId(CLIENT_ID);

    // assert
    expect(stored).toEqual({
      openedAt: OPENED_AT,
      approvedAt: APPROVED_AT,
      requests: [
        DetailRequest.reconstitute({
          id: FIRST_REQUEST_ID,
          clientId: CLIENT_ID,
          questionIds: [{ formId: "goal-availability", fieldId: "weight" }],
          note: "Please weigh yourself again.",
          askedAt: FIRST_ASKED_AT,
          answeredAt: FIRST_ANSWERED_AT,
        }),
      ],
    });
  });

  it("answers no moments and no requests before the coach has touched her review", async () => {
    // arrange
    const reviews = new PostgresOnboardingReviews(
      createDatabaseAnswering({ reviews: [], requests: [] }).client,
    );

    // act
    const stored = await reviews.findByClientId(CLIENT_ID);

    // assert
    expect(stored).toEqual({ openedAt: null, approvedAt: null, requests: [] });
  });

  it("returns both requests of a second round with the newer one still open", async () => {
    // arrange
    const reviews = new PostgresOnboardingReviews(
      createDatabaseAnswering({
        reviews: [{ openedAt: OPENED_AT, approvedAt: null }],
        requests: [
          requestRow({
            id: FIRST_REQUEST_ID,
            askedAt: FIRST_ASKED_AT,
            answeredAt: FIRST_ANSWERED_AT,
          }),
          requestRow({
            id: SECOND_REQUEST_ID,
            askedAt: SECOND_ASKED_AT,
            answeredAt: null,
          }),
        ],
      }).client,
    );

    // act
    const stored = await reviews.findByClientId(CLIENT_ID);

    // assert
    expect(stored.requests.map((request) => request.id)).toEqual([
      FIRST_REQUEST_ID,
      SECOND_REQUEST_ID,
    ]);
    expect(stored.requests.map((request) => request.isOpen())).toEqual([
      false,
      true,
    ]);
  });

  it("asks for her requests oldest first", async () => {
    // arrange
    const database = createDatabaseAnswering({ reviews: [], requests: [] });
    const reviews = new PostgresOnboardingReviews(database.client);

    // act
    await reviews.findByClientId(CLIENT_ID);

    // assert
    expect(database.orderings).toHaveLength(1);
    expect(new PgDialect().sqlToQuery(database.orderings[0] as SQL).sql).toBe(
      '"app"."client_onboarding_detail_requests"."asked_at" asc',
    );
  });
});

describe("PostgresOnboardingReviews#recordOpened", () => {
  it("keeps the first moment the coach opened her review", async () => {
    // arrange
    const database = createDatabaseRecordingReviewWrites();
    const reviews = new PostgresOnboardingReviews(database.client);

    // act
    await reviews.recordOpened({ clientId: CLIENT_ID, at: OPENED_AT });

    // assert
    expect(database.inserted).toEqual([
      {
        table: clientOnboardingReviewsTable,
        row: { clientId: CLIENT_ID, openedAt: OPENED_AT, approvedAt: null },
      },
    ]);
    expect(database.conflictTargets).toEqual([
      clientOnboardingReviewsTable.clientId,
    ]);
    expect(renderConflictSet(database, "openedAt")).toBe(
      'coalesce("app"."client_onboarding_reviews"."opened_at", excluded.opened_at)',
    );
  });
});

describe("PostgresOnboardingReviews#recordApproval", () => {
  it("records the approval as her first opening and keeps the first approval moment", async () => {
    // arrange
    const database = createDatabaseRecordingReviewWrites();
    const reviews = new PostgresOnboardingReviews(database.client);

    // act
    await reviews.recordApproval({ clientId: CLIENT_ID, at: APPROVED_AT });

    // assert
    expect(database.inserted).toEqual([
      {
        table: clientOnboardingReviewsTable,
        row: {
          clientId: CLIENT_ID,
          openedAt: APPROVED_AT,
          approvedAt: APPROVED_AT,
        },
      },
    ]);
    expect(database.conflictSets[0]).not.toHaveProperty("openedAt");
    expect(renderConflictSet(database, "approvedAt")).toBe(
      'coalesce("app"."client_onboarding_reviews"."approved_at", excluded.approved_at)',
    );
  });
});

describe("PostgresOnboardingReviews#recordRequest", () => {
  it("inserts a snapshot of the raised request", async () => {
    // arrange
    const database = createDatabaseRecordingReviewWrites();
    const reviews = new PostgresOnboardingReviews(database.client);
    const request = DetailRequest.raise({
      id: FIRST_REQUEST_ID,
      clientId: CLIENT_ID,
      questionIds: [
        { formId: "goal-availability", fieldId: "weight" },
        { formId: "nutrition-lifestyle", fieldId: "checkInDay" },
      ],
      note: "Please check these two.",
      askedAt: FIRST_ASKED_AT,
    });

    // act
    await reviews.recordRequest(request);

    // assert
    expect(database.inserted).toEqual([
      {
        table: clientOnboardingDetailRequestsTable,
        row: {
          id: FIRST_REQUEST_ID,
          clientId: CLIENT_ID,
          questionIds: [
            { formId: "goal-availability", fieldId: "weight" },
            { formId: "nutrition-lifestyle", fieldId: "checkInDay" },
          ],
          note: "Please check these two.",
          askedAt: FIRST_ASKED_AT,
          answeredAt: null,
        },
      },
    ]);
  });
});

describe("PostgresOnboardingReviews#recordAnswer", () => {
  it("stamps the open request and merges her answers into her submission in one transaction", async () => {
    // arrange
    const database = createDatabaseRecordingAnswer([{ id: FIRST_REQUEST_ID }]);
    const reviews = new PostgresOnboardingReviews(database.client);

    // act
    await reviews.recordAnswer({
      clientId: CLIENT_ID,
      requestId: FIRST_REQUEST_ID,
      mergedAnswers: answersWith({ "goal-availability": { weight: 64.5 } }),
      answeredAt: FIRST_ANSWERED_AT,
    });

    // assert
    expect(database.transactions).toBe(1);
    expect(database.updates.map((update) => update.table)).toEqual([
      clientOnboardingDetailRequestsTable,
      clientOnboardingSubmissionsTable,
    ]);
    expect(database.updates[0]?.values).toEqual({
      answeredAt: FIRST_ANSWERED_AT,
    });
  });

  it("stamps the request only while it is still open and hers", async () => {
    // arrange
    const database = createDatabaseRecordingAnswer([{ id: FIRST_REQUEST_ID }]);
    const reviews = new PostgresOnboardingReviews(database.client);

    // act
    await reviews.recordAnswer({
      clientId: CLIENT_ID,
      requestId: FIRST_REQUEST_ID,
      mergedAnswers: answersWith({ "goal-availability": { weight: 64.5 } }),
      answeredAt: FIRST_ANSWERED_AT,
    });

    // assert
    const stamped = new PgDialect().sqlToQuery(
      database.updates[0]?.condition as SQL,
    );
    expect(stamped.sql).toBe(
      '("app"."client_onboarding_detail_requests"."id" = $1 and "app"."client_onboarding_detail_requests"."client_id" = $2 and "app"."client_onboarding_detail_requests"."answered_at" is null)',
    );
    expect(stamped.params).toEqual([FIRST_REQUEST_ID, CLIENT_ID]);
  });

  it("changes nothing and fails when no open request row was stamped", async () => {
    // arrange
    const database = createDatabaseRecordingAnswer([]);
    const reviews = new PostgresOnboardingReviews(database.client);

    // act
    const recording = reviews.recordAnswer({
      clientId: CLIENT_ID,
      requestId: FIRST_REQUEST_ID,
      mergedAnswers: answersWith({ "goal-availability": { weight: 64.5 } }),
      answeredAt: FIRST_ANSWERED_AT,
    });

    // assert
    await expect(recording).rejects.toThrow(
      "The detail request is no longer open.",
    );
    expect(database.updates.map((update) => update.table)).toEqual([
      clientOnboardingDetailRequestsTable,
    ]);
  });

  it("merges only the fields she was asked, leaving every other answer alone", async () => {
    // arrange
    const database = createDatabaseRecordingAnswer([{ id: FIRST_REQUEST_ID }]);
    const reviews = new PostgresOnboardingReviews(database.client);

    // act
    await reviews.recordAnswer({
      clientId: CLIENT_ID,
      requestId: FIRST_REQUEST_ID,
      mergedAnswers: answersWith({
        "goal-availability": { weight: 64.5 },
        "nutrition-lifestyle": { checkInDay: "Friday" },
      }),
      answeredAt: FIRST_ANSWERED_AT,
    });

    // assert
    const merged = new PgDialect().sqlToQuery(
      database.updates[1]?.values.answers as SQL,
    );
    expect(merged.params).toEqual([
      "goal-availability",
      "goal-availability",
      '{"weight":64.5}',
      "nutrition-lifestyle",
      "nutrition-lifestyle",
      '{"checkInDay":"Friday"}',
    ]);
    expect(merged.sql).not.toContain("safety-screening");
    expect(merged.sql).not.toContain("cycle-context");
    expect(merged.sql).not.toContain("measurements");
  });

  it("leaves her submission answers as they are when nothing was merged", async () => {
    // arrange
    const database = createDatabaseRecordingAnswer([{ id: FIRST_REQUEST_ID }]);
    const reviews = new PostgresOnboardingReviews(database.client);

    // act
    await reviews.recordAnswer({
      clientId: CLIENT_ID,
      requestId: FIRST_REQUEST_ID,
      mergedAnswers: answersWith({}),
      answeredAt: FIRST_ANSWERED_AT,
    });

    // assert
    const merged = new PgDialect().sqlToQuery(
      database.updates[1]?.values.answers as SQL,
    );
    expect(merged.sql).toBe('"app"."client_onboarding_submissions"."answers"');
    expect(merged.params).toEqual([]);
  });
});

function answersWith(
  overrides: Partial<OnboardingAnswersByForm>,
): OnboardingAnswersByForm {
  return { ...emptyDraft(OPENED_AT).answers, ...overrides };
}

function requestRow(options: {
  id: string;
  askedAt: Date;
  answeredAt: Date | null;
}) {
  return {
    id: options.id,
    clientId: CLIENT_ID,
    questionIds: [{ formId: "goal-availability", fieldId: "weight" }],
    note: "Please weigh yourself again.",
    askedAt: options.askedAt,
    answeredAt: options.answeredAt,
  };
}

function renderConflictSet(
  database: ReturnType<typeof createDatabaseRecordingReviewWrites>,
  column: string,
): string {
  const set = database.conflictSets[0] as Record<string, SQL>;

  return new PgDialect().sqlToQuery(set[column] as SQL).sql;
}

function createDatabaseAnswering(rows: {
  reviews: readonly unknown[];
  requests: readonly unknown[];
}) {
  const orderings: unknown[] = [];
  const client = {
    select: () => ({
      from: (table: unknown) => {
        const selection = {
          where: () => selection,
          limit: () => Promise.resolve(rows.reviews),
          orderBy: (ordering: unknown) => {
            orderings.push(ordering);

            return Promise.resolve(
              table === clientOnboardingDetailRequestsTable
                ? rows.requests
                : [],
            );
          },
        };

        return selection;
      },
    }),
  } as unknown as DatabaseClient;

  return { client, orderings };
}

function createDatabaseRecordingReviewWrites() {
  const inserted: { table: unknown; row: unknown }[] = [];
  const conflictTargets: unknown[] = [];
  const conflictSets: unknown[] = [];
  const client = {
    insert: (table: unknown) => ({
      values: (row: unknown) => {
        inserted.push({ table, row });

        return {
          onConflictDoUpdate: async (config: {
            target: unknown;
            set: unknown;
          }) => {
            conflictTargets.push(config.target);
            conflictSets.push(config.set);
          },
          then: (resolve: () => void) => resolve(),
        };
      },
    }),
  } as unknown as DatabaseClient;

  return { client, conflictSets, conflictTargets, inserted };
}

function createDatabaseRecordingAnswer(stampedRows: readonly unknown[]) {
  const updates: {
    table: unknown;
    values: Record<string, unknown>;
    condition?: unknown;
  }[] = [];
  let transactions = 0;
  const transaction = {
    update: (table: unknown) => {
      const update: (typeof updates)[number] = { table, values: {} };
      updates.push(update);

      return {
        set: (values: Record<string, unknown>) => {
          update.values = values;

          return {
            where: (condition: unknown) => {
              update.condition = condition;

              return {
                returning: async () => stampedRows,
                then: (resolve: () => void) => resolve(),
              };
            },
          };
        },
      };
    },
  };
  const client = {
    transaction: async (work: (tx: unknown) => Promise<unknown>) => {
      transactions += 1;

      return work(transaction);
    },
  } as unknown as DatabaseClient;

  return {
    client,
    updates,
    get transactions() {
      return transactions;
    },
  };
}
