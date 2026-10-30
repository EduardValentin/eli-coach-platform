import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import {
  emptyDraft,
  type OnboardingAnswersByForm,
  type OnboardingSubmission,
} from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { MeasurementEntry } from "~/bounded-contexts/clients/client-profile/domain/measurement";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import type {
  MeasurementEntryWriter,
  PhotoConsentWriter,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/onboarding/client-profile-writer-ports.server";
import {
  clientOnboardingDraftsTable,
  clientOnboardingSubmissionsTable,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/schema.server";

import { PostgresClientOnboardingsRepository } from "./postgres-client-onboardings-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const UPDATED_AT = new Date("2026-10-22T09:00:00.000Z");
const CONSENTED_AT = new Date("2026-10-22T08:55:00.000Z");
const SUBMITTED_AT = new Date("2026-10-23T09:00:00.000Z");
const ENTRY_ID = "3f2b8f61-0c4e-4f7a-9d2b-6a1e5c7d8e90";

const OUTSIDE_ANY_TRANSACTION = {} as DatabaseClient;

describe("PostgresClientOnboardings#findByClientId", () => {
  it("reads her draft with its consents and no submission", async () => {
    // arrange
    const postgresClientOnboardingsRepository = onboardingsOver(
      createDatabaseAnswering({
        drafts: [
          {
            answers: answersWith({ primaryGoal: "build_strength" }),
            currentFormIndex: 2,
            specialCategoryConsentedAt: CONSENTED_AT,
            disclaimerConsentedAt: null,
            progressPhotosConsentedAt: null,
            updatedAt: UPDATED_AT,
          },
        ],
        submissions: [],
      }),
    );

    // act
    const stored =
      await postgresClientOnboardingsRepository.findByClientId(CLIENT_ID);

    // assert
    expect(stored).toEqual({
      draft: {
        answers: answersWith({ primaryGoal: "build_strength" }),
        currentFormIndex: 2,
        consents: {
          specialCategoryAt: CONSENTED_AT,
          disclaimerAt: null,
          progressPhotosAt: null,
        },
        updatedAt: UPDATED_AT,
      },
      submission: null,
    });
  });

  it("reads her submission with its consents and no draft", async () => {
    // arrange
    const postgresClientOnboardingsRepository = onboardingsOver(
      createDatabaseAnswering({
        drafts: [],
        submissions: [
          {
            answers: answersWith({ primaryGoal: "lose_fat" }),
            specialCategoryConsentedAt: CONSENTED_AT,
            disclaimerConsentedAt: CONSENTED_AT,
            progressPhotosConsentedAt: CONSENTED_AT,
            submittedAt: SUBMITTED_AT,
          },
        ],
      }),
    );

    // act
    const stored =
      await postgresClientOnboardingsRepository.findByClientId(CLIENT_ID);

    // assert
    expect(stored).toEqual({
      draft: null,
      submission: {
        answers: answersWith({ primaryGoal: "lose_fat" }),
        consents: {
          specialCategoryAt: CONSENTED_AT,
          disclaimerAt: CONSENTED_AT,
          progressPhotosAt: CONSENTED_AT,
        },
        submittedAt: SUBMITTED_AT,
      },
    });
  });

  it("answers neither a draft nor a submission before she starts", async () => {
    // arrange
    const postgresClientOnboardingsRepository = onboardingsOver(
      createDatabaseAnswering({ drafts: [], submissions: [] }),
    );

    // act
    const stored =
      await postgresClientOnboardingsRepository.findByClientId(CLIENT_ID);

    // assert
    expect(stored).toEqual({ draft: null, submission: null });
  });
});

describe("PostgresClientOnboardings#saveDraft", () => {
  it("saves her draft when the write goes through", async () => {
    // arrange
    const database = createDatabaseRecordingDraftWrites([
      { clientId: CLIENT_ID },
    ]);
    const postgresClientOnboardingsRepository = onboardingsOver(
      database.client,
    );

    // act
    const outcome = await postgresClientOnboardingsRepository.saveDraft({
      clientId: CLIENT_ID,
      draft: emptyDraft(UPDATED_AT),
    });

    // assert
    expect(outcome).toBe("saved");
    expect(database.conflictUpdates).toEqual([
      expect.objectContaining({
        answers: emptyDraft(UPDATED_AT).answers,
        currentFormIndex: 0,
        updatedAt: UPDATED_AT,
      }),
    ]);
  });

  it("answers already submitted when the guard lets no row through", async () => {
    // arrange
    const database = createDatabaseRecordingDraftWrites([]);
    const postgresClientOnboardingsRepository = onboardingsOver(
      database.client,
    );

    // act
    const outcome = await postgresClientOnboardingsRepository.saveDraft({
      clientId: CLIENT_ID,
      draft: emptyDraft(UPDATED_AT),
    });

    // assert
    expect(outcome).toBe("already-submitted");
  });

  it("writes the draft only while no submission exists for her, with every value bound", async () => {
    // arrange
    const database = createDatabaseRecordingDraftWrites([
      { clientId: CLIENT_ID },
    ]);
    const postgresClientOnboardingsRepository = onboardingsOver(
      database.client,
    );

    // act
    await postgresClientOnboardingsRepository.saveDraft({
      clientId: CLIENT_ID,
      draft: {
        ...emptyDraft(UPDATED_AT),
        consents: {
          specialCategoryAt: CONSENTED_AT,
          disclaimerAt: null,
          progressPhotosAt: null,
        },
      },
    });

    // assert
    const [guardedRow] = database.selectedRows;
    const query = new PgDialect().sqlToQuery(guardedRow as SQL);
    expect(query.sql).toMatch(
      /where not exists \(select 1 from "app"\."client_onboarding_submissions" where "app"\."client_onboarding_submissions"\."client_id" = \$\d+\)/,
    );
    expect(query.sql).not.toContain(CLIENT_ID);
    expect(query.params).toEqual([
      CLIENT_ID,
      JSON.stringify(emptyDraft(UPDATED_AT).answers),
      0,
      CONSENTED_AT,
      null,
      null,
      UPDATED_AT,
      CLIENT_ID,
    ]);
  });
});

describe("PostgresClientOnboardings#recordSubmission", () => {
  it("records her submission and first measurement and clears her draft in one transaction", async () => {
    // arrange
    const database = createDatabaseRecordingTransaction();
    const writers = createRecordingWriters();
    const postgresClientOnboardingsRepository = onboardingsOver(
      database.client,
      writers,
    );

    // act
    const outcome = await postgresClientOnboardingsRepository.recordSubmission({
      clientId: CLIENT_ID,
      submission: submission(),
      entryId: ENTRY_ID,
      measurementEntry: measurementEntry(),
    });

    // assert
    expect(outcome).toEqual({ status: "recorded" });
    expect(database.transactions).toHaveLength(1);
    expect(database.inserted).toEqual([
      {
        table: clientOnboardingSubmissionsTable,
        row: {
          clientId: CLIENT_ID,
          answers: answersWith({ primaryGoal: "lose_fat" }),
          specialCategoryConsentedAt: CONSENTED_AT,
          disclaimerConsentedAt: CONSENTED_AT,
          progressPhotosConsentedAt: null,
          submittedAt: SUBMITTED_AT,
        },
      },
    ]);
    expect(writers.measurementEntries).toEqual([
      {
        transaction: database.transactions[0],
        input: {
          clientId: CLIENT_ID,
          entryId: ENTRY_ID,
          entry: measurementEntry(),
        },
      },
    ]);
    expect(writers.photoConsents).toEqual([]);
    expect(database.deletedFrom).toEqual([clientOnboardingDraftsTable]);
  });

  it("stamps the photo consent she gave on her profile within the same transaction", async () => {
    // arrange
    const database = createDatabaseRecordingTransaction();
    const writers = createRecordingWriters();
    const postgresClientOnboardingsRepository = onboardingsOver(
      database.client,
      writers,
    );
    const consented = submission();
    consented.consents.progressPhotosAt = CONSENTED_AT;

    // act
    await postgresClientOnboardingsRepository.recordSubmission({
      clientId: CLIENT_ID,
      submission: consented,
      entryId: ENTRY_ID,
      measurementEntry: measurementEntry(),
    });

    // assert
    expect(writers.photoConsents).toEqual([
      {
        transaction: database.transactions[0],
        consent: { clientId: CLIENT_ID, at: CONSENTED_AT },
      },
    ]);
  });

  it("answers already submitted when a submission already exists for her", async () => {
    // arrange
    const postgresClientOnboardingsRepository = onboardingsOver(
      createDatabaseFailingTransactionWith(
        uniqueViolation("client_onboarding_submissions_client_id_unique"),
      ),
    );

    // act
    const outcome = await postgresClientOnboardingsRepository.recordSubmission({
      clientId: CLIENT_ID,
      submission: submission(),
      entryId: ENTRY_ID,
      measurementEntry: measurementEntry(),
    });

    // assert
    expect(outcome).toEqual({ status: "already-submitted" });
  });

  it("rethrows any other unique violation", async () => {
    // arrange
    const failure = uniqueViolation("client_measurements_pkey");
    const postgresClientOnboardingsRepository = onboardingsOver(
      createDatabaseFailingTransactionWith(failure),
    );

    // act
    const recording = postgresClientOnboardingsRepository.recordSubmission({
      clientId: CLIENT_ID,
      submission: submission(),
      entryId: ENTRY_ID,
      measurementEntry: measurementEntry(),
    });

    // assert
    await expect(recording).rejects.toBe(failure);
  });

  it("rethrows a failure that is not a unique violation", async () => {
    // arrange
    const failure = Object.assign(new Error("connection reset"), {
      code: "08006",
      constraint: "client_onboarding_submissions_client_id_unique",
    });
    const postgresClientOnboardingsRepository = onboardingsOver(
      createDatabaseFailingTransactionWith(failure),
    );

    // act
    const recording = postgresClientOnboardingsRepository.recordSubmission({
      clientId: CLIENT_ID,
      submission: submission(),
      entryId: ENTRY_ID,
      measurementEntry: measurementEntry(),
    });

    // assert
    await expect(recording).rejects.toBe(failure);
  });
});

function answersWith(
  goalAvailability: Record<string, string>,
): OnboardingAnswersByForm {
  return {
    ...emptyDraft(UPDATED_AT).answers,
    "goal-availability": goalAvailability,
  };
}

function submission(): OnboardingSubmission {
  return {
    answers: answersWith({ primaryGoal: "lose_fat" }),
    consents: {
      specialCategoryAt: CONSENTED_AT,
      disclaimerAt: CONSENTED_AT,
      progressPhotosAt: null,
    },
    submittedAt: SUBMITTED_AT,
  };
}

function measurementEntry(): MeasurementEntry {
  return {
    recordedAt: SUBMITTED_AT,
    weightKg: 64.5,
    waistCm: 72,
    hipsCm: 96.5,
  };
}

function uniqueViolation(constraint: string): Error {
  return Object.assign(new Error("duplicate key value"), {
    cause: { code: "23505", constraint },
  });
}

function createDatabaseAnswering(rows: {
  drafts: readonly unknown[];
  submissions: readonly unknown[];
}): DatabaseClient {
  return {
    select: () => ({
      from: (table: unknown) => {
        const answer =
          table === clientOnboardingDraftsTable
            ? rows.drafts
            : rows.submissions;
        const selection = {
          where: () => selection,
          limit: () => Promise.resolve(answer),
        };

        return selection;
      },
    }),
  } as unknown as DatabaseClient;
}

function createDatabaseRecordingDraftWrites(writtenRows: readonly unknown[]) {
  const selectedRows: unknown[] = [];
  const conflictUpdates: unknown[] = [];
  const client = {
    insert: () => ({
      select: (row: unknown) => {
        selectedRows.push(row);

        return {
          onConflictDoUpdate: (config: { set: unknown }) => {
            conflictUpdates.push(config.set);

            return { returning: async () => writtenRows };
          },
        };
      },
    }),
  } as unknown as DatabaseClient;

  return { client, conflictUpdates, selectedRows };
}

function onboardingsOver(
  database: DatabaseClient,
  writers: ReturnType<typeof createRecordingWriters> = createRecordingWriters(),
): PostgresClientOnboardingsRepository {
  return new PostgresClientOnboardingsRepository({
    database,
    measurementEntryWriter: writers.measurementEntryWriter,
    photoConsentWriter: writers.photoConsentWriter,
  });
}

function createRecordingWriters() {
  const photoConsents: {
    transaction: unknown;
    consent: Parameters<PhotoConsentWriter>[0];
  }[] = [];
  const measurementEntries: {
    transaction: unknown;
    input: Parameters<MeasurementEntryWriter>[0];
  }[] = [];
  const photoConsentWriter: PhotoConsentWriter = async (consent) => {
    photoConsents.push({
      transaction: executorOf(OUTSIDE_ANY_TRANSACTION),
      consent,
    });
  };
  const measurementEntryWriter: MeasurementEntryWriter = async (input) => {
    measurementEntries.push({
      transaction: executorOf(OUTSIDE_ANY_TRANSACTION),
      input,
    });
  };

  return {
    measurementEntries,
    measurementEntryWriter,
    photoConsentWriter,
    photoConsents,
  };
}

function createDatabaseRecordingTransaction() {
  const deletedFrom: unknown[] = [];
  const inserted: { table: unknown; row: unknown }[] = [];
  const transactions: unknown[] = [];
  const transaction = {
    insert: (table: unknown) => ({
      values: async (row: unknown) => {
        inserted.push({ table, row });
      },
    }),
    delete: (table: unknown) => {
      deletedFrom.push(table);

      return { where: async () => undefined };
    },
  };
  const client = {
    transaction: async (work: (tx: unknown) => Promise<unknown>) => {
      transactions.push(transaction);

      return work(transaction);
    },
  } as unknown as DatabaseClient;

  return { client, deletedFrom, inserted, transactions };
}

function createDatabaseFailingTransactionWith(failure: Error): DatabaseClient {
  return {
    transaction: async () => {
      throw failure;
    },
  } as unknown as DatabaseClient;
}
