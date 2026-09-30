import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  DetailRequest,
  emptyDraft,
  type OnboardingAnswersByForm,
} from "@eli-coach-platform/domain/client-onboarding";
import { ClientProfile } from "@eli-coach-platform/domain/client-profile";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  clientOnboardingConstraints,
  clientOnboardingDetailRequestsTable,
  clientOnboardingReviewsTable,
  clientOnboardingSubmissionsTable,
  clientProfilesTable,
} from "~/features/client-onboarding/data/schema.server";

import {
  PostgresOnboardingReviews,
  type ReviewStampWriter,
} from "./onboarding-reviews-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const FIRST_REQUEST_ID = "0b5f2f0e-3a1c-4c47-9a57-8f2d7f1e6a01";
const SECOND_REQUEST_ID = "3d9a1c44-5b7e-4f0a-8c21-6e4b9d2f7a02";
const OPENED_AT = new Date("2026-09-29T09:00:00.000Z");
const FIRST_ASKED_AT = new Date("2026-09-29T10:00:00.000Z");
const FIRST_ANSWERED_AT = new Date("2026-09-30T08:00:00.000Z");
const SECOND_ASKED_AT = new Date("2026-10-01T10:00:00.000Z");
const APPROVED_AT = new Date("2026-10-02T09:00:00.000Z");
const OPENED_STAMPS = {
  reviewOpenedAt: OPENED_AT,
  detailsRequestedAt: null,
  detailsAnsweredAt: null,
  answersApprovedAt: null,
};
const REQUESTED_STAMPS = {
  ...OPENED_STAMPS,
  detailsRequestedAt: FIRST_ASKED_AT,
};
const ANSWERED_STAMPS = {
  ...REQUESTED_STAMPS,
  detailsAnsweredAt: FIRST_ANSWERED_AT,
};
const APPROVED_STAMPS = {
  ...OPENED_STAMPS,
  reviewOpenedAt: APPROVED_AT,
  answersApprovedAt: APPROVED_AT,
};

describe("PostgresOnboardingReviews#findByClientId", () => {
  it("reads the review moments and her requests into one stored review", async () => {
    // arrange
    const reviews = reviewsOver(
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
    const reviews = reviewsOver(
      createDatabaseAnswering({ reviews: [], requests: [] }).client,
    );

    // act
    const stored = await reviews.findByClientId(CLIENT_ID);

    // assert
    expect(stored).toEqual({ openedAt: null, approvedAt: null, requests: [] });
  });

  it("returns both requests of a second round with the newer one still open", async () => {
    // arrange
    const reviews = reviewsOver(
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
    const reviews = reviewsOver(database.client);

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
  it("keeps the first moment the coach opened her review and projects its stamps in the same transaction", async () => {
    // arrange
    const database = createTransactionalDatabase();
    const writer = createStampWriter();
    const reviews = reviewsOver(database.client, writer);

    // act
    await reviews.recordOpened({
      clientId: CLIENT_ID,
      at: OPENED_AT,
      stamps: OPENED_STAMPS,
    });

    // assert
    expect(database.transactions).toBe(1);
    expect(database.committed).toEqual([
      {
        table: clientOnboardingReviewsTable,
        values: { clientId: CLIENT_ID, openedAt: OPENED_AT, approvedAt: null },
        conflict: expect.objectContaining({
          target: clientOnboardingReviewsTable.clientId,
        }),
      },
    ]);
    expect(renderConflictSet(database.committed[0], "openedAt")).toBe(
      'coalesce("app"."client_onboarding_reviews"."opened_at", excluded.opened_at)',
    );
    expect(writer.calls).toEqual([
      {
        transaction: database.handles[0],
        projection: { clientId: CLIENT_ID, stamps: OPENED_STAMPS },
      },
    ]);
  });
});

describe("PostgresOnboardingReviews#recordApproval", () => {
  it("records the approval as her first opening, keeps the first approval moment and projects its stamps in the same transaction", async () => {
    // arrange
    const database = createTransactionalDatabase();
    const writer = createStampWriter();
    const reviews = reviewsOver(database.client, writer);

    // act
    await reviews.recordApproval({
      clientId: CLIENT_ID,
      at: APPROVED_AT,
      stamps: APPROVED_STAMPS,
    });

    // assert
    expect(database.transactions).toBe(1);
    expect(database.committed).toEqual([
      {
        table: clientOnboardingReviewsTable,
        values: {
          clientId: CLIENT_ID,
          openedAt: APPROVED_AT,
          approvedAt: APPROVED_AT,
        },
        conflict: expect.anything(),
      },
    ]);
    expect(database.committed[0]?.conflict?.set).not.toHaveProperty("openedAt");
    expect(renderConflictSet(database.committed[0], "approvedAt")).toBe(
      'coalesce("app"."client_onboarding_reviews"."approved_at", excluded.approved_at)',
    );
    expect(writer.calls).toEqual([
      {
        transaction: database.handles[0],
        projection: { clientId: CLIENT_ID, stamps: APPROVED_STAMPS },
      },
    ]);
  });
});

describe("PostgresOnboardingReviews#recordRequest", () => {
  it("inserts a snapshot of the raised request and projects its stamps in the same transaction", async () => {
    // arrange
    const database = createTransactionalDatabase();
    const writer = createStampWriter();
    const reviews = reviewsOver(database.client, writer);
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
    const outcome = await reviews.recordRequest({
      request,
      stamps: REQUESTED_STAMPS,
    });

    // assert
    expect(outcome).toBe("recorded");
    expect(database.transactions).toBe(1);
    expect(database.committed).toEqual([
      {
        table: clientOnboardingDetailRequestsTable,
        values: {
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
    expect(writer.calls).toEqual([
      {
        transaction: database.handles[0],
        projection: { clientId: CLIENT_ID, stamps: REQUESTED_STAMPS },
      },
    ]);
  });
});

describe("PostgresOnboardingReviews#recordRequest while another request is open", () => {
  it("answers already open without projecting stamps when the open-request-per-client index refuses the insert", async () => {
    // arrange
    const writer = createStampWriter();
    const reviews = reviewsOver(
      createTransactionalDatabase({
        insertFailure: uniqueViolation(
          clientOnboardingConstraints.openDetailRequestPerClient,
        ),
      }).client,
      writer,
    );

    // act
    const outcome = await reviews.recordRequest(requestWithStamps());

    // assert
    expect(outcome).toBe("already-open");
    expect(writer.calls).toEqual([]);
  });

  it("rethrows a unique violation on any other constraint", async () => {
    // arrange
    const failure = uniqueViolation("client_onboarding_detail_requests_pkey");
    const reviews = reviewsOver(
      createTransactionalDatabase({ insertFailure: failure }).client,
    );

    // act
    const recording = reviews.recordRequest(requestWithStamps());

    // assert
    await expect(recording).rejects.toBe(failure);
  });

  it("rethrows a database failure it cannot name", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const reviews = reviewsOver(
      createTransactionalDatabase({ insertFailure: failure }).client,
    );

    // act
    const recording = reviews.recordRequest(requestWithStamps());

    // assert
    await expect(recording).rejects.toBe(failure);
  });
});

describe("PostgresOnboardingReviews#recordAnswer", () => {
  it("stamps the open request, merges her answers, rewrites her profile and projects her stamps in one transaction", async () => {
    // arrange
    const database = createTransactionalDatabase();
    const writer = createStampWriter();
    const reviews = reviewsOver(database.client, writer);

    // act
    await reviews.recordAnswer(
      answerOf(answersWith({ "goal-availability": { weight: 64.5 } })),
    );

    // assert
    expect(database.transactions).toBe(1);
    expect(database.committed.map((write) => write.table)).toEqual([
      clientOnboardingDetailRequestsTable,
      clientOnboardingSubmissionsTable,
      clientProfilesTable,
    ]);
    expect(database.committed[0]?.values).toEqual({
      answeredAt: FIRST_ANSWERED_AT,
    });
    expect(database.committed[2]?.values).toEqual({
      ...profile().toSnapshot(),
      createdAt: FIRST_ANSWERED_AT,
    });
    expect(writer.calls).toEqual([
      {
        transaction: database.handles[0],
        projection: { clientId: CLIENT_ID, stamps: ANSWERED_STAMPS },
      },
    ]);
  });

  it("stamps the request only while it is still open and hers", async () => {
    // arrange
    const database = createTransactionalDatabase();
    const reviews = reviewsOver(database.client);

    // act
    await reviews.recordAnswer(
      answerOf(answersWith({ "goal-availability": { weight: 64.5 } })),
    );

    // assert
    const stamped = new PgDialect().sqlToQuery(
      database.committed[0]?.condition as SQL,
    );
    expect(stamped.sql).toBe(
      '("app"."client_onboarding_detail_requests"."id" = $1 and "app"."client_onboarding_detail_requests"."client_id" = $2 and "app"."client_onboarding_detail_requests"."answered_at" is null)',
    );
    expect(stamped.params).toEqual([FIRST_REQUEST_ID, CLIENT_ID]);
  });

  it("changes nothing, projects no stamps and fails when no open request row was stamped", async () => {
    // arrange
    const database = createTransactionalDatabase({ answeredRows: [] });
    const writer = createStampWriter();
    const reviews = reviewsOver(database.client, writer);

    // act
    const recording = reviews.recordAnswer(
      answerOf(answersWith({ "goal-availability": { weight: 64.5 } })),
    );

    // assert
    await expect(recording).rejects.toThrow(
      "The detail request is no longer open.",
    );
    expect(database.committed).toEqual([]);
    expect(writer.calls).toEqual([]);
  });

  it("merges only the fields she was asked, leaving every other answer alone", async () => {
    // arrange
    const database = createTransactionalDatabase();
    const reviews = reviewsOver(database.client);

    // act
    await reviews.recordAnswer(
      answerOf(
        answersWith({
          "goal-availability": { weight: 64.5 },
          "nutrition-lifestyle": { checkInDay: "Friday" },
        }),
      ),
    );

    // assert
    const merged = new PgDialect().sqlToQuery(mergedAnswersOf(database));
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
    const database = createTransactionalDatabase();
    const reviews = reviewsOver(database.client);

    // act
    await reviews.recordAnswer(answerOf(answersWith({})));

    // assert
    const merged = new PgDialect().sqlToQuery(mergedAnswersOf(database));
    expect(merged.sql).toBe('"app"."client_onboarding_submissions"."answers"');
    expect(merged.params).toEqual([]);
  });
});

describe("PostgresOnboardingReviews when the stamp write fails", () => {
  const stampFailure = new Error("clients update failed");

  it.each([
    [
      "the opening",
      (reviews: PostgresOnboardingReviews) =>
        reviews.recordOpened({
          clientId: CLIENT_ID,
          at: OPENED_AT,
          stamps: OPENED_STAMPS,
        }),
    ],
    [
      "the request",
      (reviews: PostgresOnboardingReviews) =>
        reviews.recordRequest(requestWithStamps()),
    ],
    [
      "the answer",
      (reviews: PostgresOnboardingReviews) =>
        reviews.recordAnswer(
          answerOf(answersWith({ "goal-availability": { weight: 64.5 } })),
        ),
    ],
    [
      "the approval",
      (reviews: PostgresOnboardingReviews) =>
        reviews.recordApproval({
          clientId: CLIENT_ID,
          at: APPROVED_AT,
          stamps: APPROVED_STAMPS,
        }),
    ],
  ])("rolls back %s and rethrows", async (_transition, record) => {
    // arrange
    const database = createTransactionalDatabase();
    const writer = createFailingStampWriter(stampFailure);
    const reviews = reviewsOver(database.client, writer);

    // act
    const recording = record(reviews);

    // assert
    await expect(recording).rejects.toBe(stampFailure);
    expect(writer.calls).toHaveLength(1);
    expect(database.committed).toEqual([]);
  });
});

function reviewsOver(
  database: DatabaseClient,
  writer: StampWriterDouble = createStampWriter(),
): PostgresOnboardingReviews {
  return new PostgresOnboardingReviews({
    database,
    reviewStampWriter: writer.write,
  });
}

function answersWith(
  overrides: Partial<OnboardingAnswersByForm>,
): OnboardingAnswersByForm {
  return { ...emptyDraft(OPENED_AT).answers, ...overrides };
}

function answerOf(mergedAnswers: OnboardingAnswersByForm) {
  return {
    clientId: CLIENT_ID,
    requestId: FIRST_REQUEST_ID,
    mergedAnswers,
    answeredAt: FIRST_ANSWERED_AT,
    profile: profile(),
    stamps: ANSWERED_STAMPS,
  };
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
  write: RecordedWrite | undefined,
  column: string,
): string {
  const set = write?.conflict?.set as Record<string, SQL>;

  return new PgDialect().sqlToQuery(set[column] as SQL).sql;
}

function mergedAnswersOf(
  database: ReturnType<typeof createTransactionalDatabase>,
): SQL {
  const submissionWrite = database.committed.find(
    (write) => write.table === clientOnboardingSubmissionsTable,
  );

  return (submissionWrite?.values as { answers: SQL }).answers;
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

type RecordedWrite = {
  table: unknown;
  values: unknown;
  conflict?: { target: unknown; set: unknown };
  condition?: unknown;
};

type TransactionalDatabaseOptions = {
  answeredRows?: readonly unknown[];
  insertFailure?: Error;
};

function createTransactionalDatabase(
  options: TransactionalDatabaseOptions = {},
) {
  const committed: RecordedWrite[] = [];
  const handles: unknown[] = [];
  let transactions = 0;
  const client = {
    transaction: async (work: (transaction: unknown) => Promise<unknown>) => {
      transactions += 1;
      const pending: RecordedWrite[] = [];
      const transaction = createRecordingTransaction(pending, options);
      handles.push(transaction);

      const result = await work(transaction);
      committed.push(...pending);

      return result;
    },
  } as unknown as DatabaseClient;

  return {
    client,
    committed,
    handles,
    get transactions() {
      return transactions;
    },
  };
}

function createRecordingTransaction(
  pending: RecordedWrite[],
  options: TransactionalDatabaseOptions,
) {
  return {
    insert: (table: unknown) => ({
      values: (values: unknown) => ({
        onConflictDoUpdate: async (conflict: {
          target: unknown;
          set: unknown;
        }) => {
          pending.push({ table, values, conflict });
        },
        then: (resolve: () => void, reject: (error: Error) => void) => {
          if (options.insertFailure) {
            reject(options.insertFailure);

            return;
          }

          pending.push({ table, values });
          resolve();
        },
      }),
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: (condition: unknown) => {
          pending.push({ table, values, condition });

          return {
            returning: async () =>
              options.answeredRows ?? [{ id: FIRST_REQUEST_ID }],
            then: (resolve: () => void) => resolve(),
          };
        },
      }),
    }),
  };
}

type StampWriterDouble = {
  write: ReviewStampWriter;
  calls: { transaction: unknown; projection: unknown }[];
};

function createStampWriter(): StampWriterDouble {
  const calls: StampWriterDouble["calls"] = [];

  return {
    calls,
    write: async (transaction, projection) => {
      calls.push({ transaction, projection });
    },
  };
}

function createFailingStampWriter(failure: Error): StampWriterDouble {
  const calls: StampWriterDouble["calls"] = [];

  return {
    calls,
    write: async (transaction, projection) => {
      calls.push({ transaction, projection });
      throw failure;
    },
  };
}

function profile(): ClientProfile {
  return ClientProfile.reconstitute({
    clientId: CLIENT_ID,
    heightCm: 168,
    activityLevel: "Lightly active",
    primaryGoal: "Lose fat",
    dietaryRestrictions: "None",
    clientNotes: null,
    updatedAt: FIRST_ANSWERED_AT,
  });
}

function requestWithStamps() {
  return {
    request: DetailRequest.raise({
      id: FIRST_REQUEST_ID,
      clientId: CLIENT_ID,
      questionIds: [{ formId: "goal-availability", fieldId: "weight" }],
      note: "Please check your weight.",
      askedAt: FIRST_ASKED_AT,
    }),
    stamps: REQUESTED_STAMPS,
  };
}

function uniqueViolation(constraint: string): Error {
  return Object.assign(new Error("duplicate key value"), {
    cause: { code: "23505", constraint },
  });
}
