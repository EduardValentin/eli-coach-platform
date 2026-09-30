import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  emptyDraft,
  type OnboardingAnswersByForm,
  type OnboardingSubmission,
} from "@eli-coach-platform/domain/client-onboarding";
import { ClientProfile } from "@eli-coach-platform/domain/client-profile";
import type { MeasurementEntry } from "@eli-coach-platform/domain/measurement";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import type {
  ClientProfileWriter,
  MeasurementEntryWriter,
} from "~/features/client-onboarding/data/client-profile-writers.server";
import {
  clientOnboardingDraftsTable,
  clientOnboardingSubmissionsTable,
} from "~/features/client-onboarding/data/schema.server";

import { PostgresClientOnboardings } from "./client-onboardings-repository.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const UPDATED_AT = new Date("2026-10-22T09:00:00.000Z");
const CONSENTED_AT = new Date("2026-10-22T08:55:00.000Z");
const SUBMITTED_AT = new Date("2026-10-23T09:00:00.000Z");

describe("PostgresClientOnboardings#findByClientId", () => {
  it("reads her draft with its consents and no submission", async () => {
    // arrange
    const onboardings = onboardingsOver(
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
    const stored = await onboardings.findByClientId(CLIENT_ID);

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
    const onboardings = onboardingsOver(
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
    const stored = await onboardings.findByClientId(CLIENT_ID);

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
    const onboardings = onboardingsOver(
      createDatabaseAnswering({ drafts: [], submissions: [] }),
    );

    // act
    const stored = await onboardings.findByClientId(CLIENT_ID);

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
    const onboardings = onboardingsOver(database.client);

    // act
    const outcome = await onboardings.saveDraft({
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
    const onboardings = onboardingsOver(database.client);

    // act
    const outcome = await onboardings.saveDraft({
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
    const onboardings = onboardingsOver(database.client);

    // act
    await onboardings.saveDraft({
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
  it("records her submission, first measurement and profile and clears her draft in one transaction", async () => {
    // arrange
    const database = createDatabaseRecordingTransaction();
    const writers = createRecordingWriters();
    const onboardings = onboardingsOver(database.client, writers);

    // act
    const outcome = await onboardings.recordSubmission({
      clientId: CLIENT_ID,
      submission: submission(),
      measurementEntry: measurementEntry(),
      profile: profile(),
    });

    // assert
    expect(outcome).toBe("recorded");
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
        input: { clientId: CLIENT_ID, entry: measurementEntry() },
      },
    ]);
    expect(writers.profiles).toEqual([
      { transaction: database.transactions[0], profile: profile() },
    ]);
    expect(database.deletedFrom).toEqual([clientOnboardingDraftsTable]);
  });

  it("answers already submitted when a submission already exists for her", async () => {
    // arrange
    const onboardings = onboardingsOver(
      createDatabaseFailingTransactionWith(
        uniqueViolation("client_onboarding_submissions_client_id_unique"),
      ),
    );

    // act
    const outcome = await onboardings.recordSubmission({
      clientId: CLIENT_ID,
      submission: submission(),
      measurementEntry: measurementEntry(),
      profile: profile(),
    });

    // assert
    expect(outcome).toBe("already-submitted");
  });

  it("rethrows any other unique violation", async () => {
    // arrange
    const failure = uniqueViolation("client_measurements_pkey");
    const onboardings = onboardingsOver(
      createDatabaseFailingTransactionWith(failure),
    );

    // act
    const recording = onboardings.recordSubmission({
      clientId: CLIENT_ID,
      submission: submission(),
      measurementEntry: measurementEntry(),
      profile: profile(),
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
    const onboardings = onboardingsOver(
      createDatabaseFailingTransactionWith(failure),
    );

    // act
    const recording = onboardings.recordSubmission({
      clientId: CLIENT_ID,
      submission: submission(),
      measurementEntry: measurementEntry(),
      profile: profile(),
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

function profile(): ClientProfile {
  return ClientProfile.reconstitute({
    clientId: CLIENT_ID,
    heightCm: 168,
    activityLevel: "Lightly active",
    primaryGoal: "Lose fat",
    dietaryRestrictions: "None",
    clientNotes: null,
    progressPhotosConsentedAt: null,
    updatedAt: SUBMITTED_AT,
  });
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
): PostgresClientOnboardings {
  return new PostgresClientOnboardings({
    database,
    clientProfileWriter: writers.clientProfileWriter,
    measurementEntryWriter: writers.measurementEntryWriter,
  });
}

function createRecordingWriters() {
  const profiles: { transaction: unknown; profile: ClientProfile }[] = [];
  const measurementEntries: {
    transaction: unknown;
    input: Parameters<MeasurementEntryWriter>[1];
  }[] = [];
  const clientProfileWriter: ClientProfileWriter = async (
    transaction,
    written,
  ) => {
    profiles.push({ transaction, profile: written });
  };
  const measurementEntryWriter: MeasurementEntryWriter = async (
    transaction,
    input,
  ) => {
    measurementEntries.push({ transaction, input });
  };

  return {
    clientProfileWriter,
    measurementEntries,
    measurementEntryWriter,
    profiles,
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
