import type { DatabaseClient } from "~/shared/database";
import { AssessmentCall } from "@eli-coach-platform/domain/assessment-call";
import { describe, expect, it, vi } from "vitest";

import { PostgresAssessmentCallRepository } from "./repository.server";
import { assessmentCallsTable } from "./schema.server";

const STORED_ROW = {
  id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
  firstName: "Ana",
  lastName: "Popescu",
  visitorEmail: "ana@example.com",
  visitorNotes: "Training three times a week.",
  dateOfBirth: "1994-03-14",
  gender: "female" as const,
  primaryGoal: "build_strength" as const,
  country: "RO",
  phone: "+40712345678",
  startsAt: new Date("2026-10-01T14:00:00.000Z"),
  visitorTimeZone: "Europe/Bucharest",
  coachTimeZone: "Europe/Bucharest",
  bookedAt: new Date("2026-09-18T09:30:00.000Z"),
};

describe("PostgresAssessmentCallRepository row mapping", () => {
  it("maps a stored row into the assessment call the domain reads", async () => {
    // arrange
    const repository = new PostgresAssessmentCallRepository(
      repositoryOptions(createDatabaseReturning([STORED_ROW])),
    );

    // act
    const call = await repository.findById(STORED_ROW.id);

    // assert
    expect(call?.toSnapshot()).toEqual({
      id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
      firstName: "Ana",
      lastName: "Popescu",
      fullName: "Ana Popescu",
      visitorEmail: "ana@example.com",
      visitorNotes: "Training three times a week.",
      dateOfBirth: "1994-03-14",
      gender: "female",
      primaryGoal: "build_strength",
      country: "RO",
      phone: "+40712345678",
      startsAt: new Date("2026-10-01T14:00:00.000Z"),
      endsAt: new Date("2026-10-01T14:30:00.000Z"),
      visitorTimeZone: "Europe/Bucharest",
      coachTimeZone: "Europe/Bucharest",
      bookedAt: new Date("2026-09-18T09:30:00.000Z"),
    });
  });

  it("maps an absent note to no note", async () => {
    // arrange
    const repository = new PostgresAssessmentCallRepository(
      repositoryOptions(
        createDatabaseReturning([{ ...STORED_ROW, visitorNotes: null }]),
      ),
    );

    // act
    const call = await repository.findById(STORED_ROW.id);

    // assert
    expect(call?.toSnapshot().visitorNotes).toBeNull();
  });

  it("maps an absent phone to no phone", async () => {
    // arrange
    const repository = new PostgresAssessmentCallRepository(
      repositoryOptions(
        createDatabaseReturning([{ ...STORED_ROW, phone: null }]),
      ),
    );

    // act
    const call = await repository.findById(STORED_ROW.id);

    // assert
    expect(call?.toSnapshot().phone).toBeNull();
  });

  it("finds no call for an identifier that matches no row", async () => {
    // arrange
    const repository = new PostgresAssessmentCallRepository(
      repositoryOptions(createDatabaseReturning([])),
    );

    // act
    const call = await repository.findById(STORED_ROW.id);

    // assert
    expect(call).toBeNull();
  });

  it("finds no call for an identifier Postgres cannot read", async () => {
    // arrange
    const repository = new PostgresAssessmentCallRepository(
      repositoryOptions(
        createDatabaseRejecting(createDatabaseError({ code: "22P02" })),
      ),
    );

    // act
    const call = await repository.findById("not-an-identifier");

    // assert
    expect(call).toBeNull();
  });
});

describe("PostgresAssessmentCallRepository#listAll", () => {
  it("maps every stored row into the assessment calls the domain reads", async () => {
    // arrange
    const laterRow = {
      ...STORED_ROW,
      id: "9c2b7d41-0e58-4a17-8c6f-2d4e7b9a1f03",
      startsAt: new Date("2026-10-02T14:00:00.000Z"),
    };
    const repository = new PostgresAssessmentCallRepository(
      repositoryOptions(createDatabaseReturning([STORED_ROW, laterRow])),
    );

    // act
    const calls = await repository.listAll();

    // assert
    expect(calls.map((call) => call.toSnapshot())).toEqual([
      {
        id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
        firstName: "Ana",
        lastName: "Popescu",
        fullName: "Ana Popescu",
        visitorEmail: "ana@example.com",
        visitorNotes: "Training three times a week.",
        dateOfBirth: "1994-03-14",
        gender: "female",
        primaryGoal: "build_strength",
        country: "RO",
        phone: "+40712345678",
        startsAt: new Date("2026-10-01T14:00:00.000Z"),
        endsAt: new Date("2026-10-01T14:30:00.000Z"),
        visitorTimeZone: "Europe/Bucharest",
        coachTimeZone: "Europe/Bucharest",
        bookedAt: new Date("2026-09-18T09:30:00.000Z"),
      },
      {
        id: "9c2b7d41-0e58-4a17-8c6f-2d4e7b9a1f03",
        firstName: "Ana",
        lastName: "Popescu",
        fullName: "Ana Popescu",
        visitorEmail: "ana@example.com",
        visitorNotes: "Training three times a week.",
        dateOfBirth: "1994-03-14",
        gender: "female",
        primaryGoal: "build_strength",
        country: "RO",
        phone: "+40712345678",
        startsAt: new Date("2026-10-02T14:00:00.000Z"),
        endsAt: new Date("2026-10-02T14:30:00.000Z"),
        visitorTimeZone: "Europe/Bucharest",
        coachTimeZone: "Europe/Bucharest",
        bookedAt: new Date("2026-09-18T09:30:00.000Z"),
      },
    ]);
  });

  it("lists nothing when no call is booked", async () => {
    // arrange
    const repository = new PostgresAssessmentCallRepository(
      repositoryOptions(createDatabaseReturning([])),
    );

    // act
    const calls = await repository.listAll();

    // assert
    expect(calls).toEqual([]);
  });
});

describe("PostgresAssessmentCallRepository#reserve", () => {
  it("stores the call under the id the domain gave it and reserves the coach's time for that id", async () => {
    // arrange
    const { bookedAt, ...visitorAndSlot } = STORED_ROW;
    const call = AssessmentCall.booked({ ...visitorAndSlot, at: bookedAt });
    const database = createDatabaseRecordingReservation();
    const coachTime = {
      reserve: vi.fn().mockResolvedValue({ status: "reserved" }),
    };
    const repository = new PostgresAssessmentCallRepository({
      coachTime,
      database: database.handle,
    });

    // act
    const decision = await repository.reserve({ call, now: bookedAt });

    // assert
    expect(decision).toEqual({ status: "reserved" });
    expect(database.inserts).toEqual([
      { table: assessmentCallsTable, values: STORED_ROW },
    ]);
    expect(coachTime.reserve).toHaveBeenCalledWith(
      database.transaction,
      expect.objectContaining({
        appointmentKind: "assessment_call",
        appointmentId: STORED_ROW.id,
      }),
    );
  });
});

function createDatabaseRecordingReservation() {
  const inserts: { table: unknown; values: unknown }[] = [];
  const transaction = {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockReturnValue(createQueryChain([])),
    insert: (table: unknown) => ({
      values: async (values: unknown) => {
        inserts.push({ table, values });
      },
    }),
  };
  const handle = {
    transaction: (work: (handle: unknown) => Promise<unknown>) =>
      work(transaction),
  } as unknown as DatabaseClient;

  return { handle, inserts, transaction };
}

function repositoryOptions(database: DatabaseClient) {
  return {
    coachTime: { reserve: vi.fn() },
    database,
  };
}

function createDatabaseReturning(rows: readonly unknown[]): DatabaseClient {
  return {
    select: vi.fn().mockReturnValue(createQueryChain(rows)),
  } as unknown as DatabaseClient;
}

function createDatabaseRejecting(error: Error): DatabaseClient {
  return {
    select: vi.fn().mockReturnValue(createRejectingQueryChain(error)),
  } as unknown as DatabaseClient;
}

function createQueryChain(rows: readonly unknown[]) {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    then: (onFulfilled: (value: readonly unknown[]) => unknown) =>
      Promise.resolve(rows).then(onFulfilled),
  };

  return chain;
}

function createRejectingQueryChain(error: Error) {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    then: (
      onFulfilled: (value: readonly unknown[]) => unknown,
      onRejected: (reason: unknown) => unknown,
    ) => Promise.reject(error).then(onFulfilled, onRejected),
  };

  return chain;
}

function createDatabaseError(options: {
  code: string;
  constraint?: string;
}): Error & { code: string; constraint?: string } {
  return Object.assign(
    new Error(`Database error ${options.code}`),
    options,
  ) as Error & { code: string; constraint?: string };
}
