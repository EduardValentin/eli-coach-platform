import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it, vi } from "vitest";

import { PostgresAssessmentCallRepository } from "./repository.server";

const STORED_ROW = {
  id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
  visitorName: "Ana Popescu",
  visitorEmail: "ana@example.com",
  visitorNotes: "Training three times a week.",
  startsAt: new Date("2026-10-01T14:00:00.000Z"),
  visitorTimeZone: "Europe/Bucharest",
  coachTimeZone: "Europe/Bucharest",
  bookedAt: new Date("2026-09-18T09:30:00.000Z"),
};

describe("PostgresAssessmentCallRepository row mapping", () => {
  it("maps a stored row into the assessment call the domain reads", async () => {
    // arrange
    const repository = new PostgresAssessmentCallRepository(
      createDatabaseReturning([STORED_ROW]),
    );

    // act
    const call = await repository.findById(STORED_ROW.id);

    // assert
    expect(call?.toSnapshot()).toEqual({
      id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
      visitorName: "Ana Popescu",
      visitorEmail: "ana@example.com",
      visitorNotes: "Training three times a week.",
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
      createDatabaseReturning([{ ...STORED_ROW, visitorNotes: null }]),
    );

    // act
    const call = await repository.findById(STORED_ROW.id);

    // assert
    expect(call?.toSnapshot().visitorNotes).toBeNull();
  });

  it("finds no call for an identifier that matches no row", async () => {
    // arrange
    const repository = new PostgresAssessmentCallRepository(
      createDatabaseReturning([]),
    );

    // act
    const call = await repository.findById(STORED_ROW.id);

    // assert
    expect(call).toBeNull();
  });

  it("finds no call for an identifier Postgres cannot read", async () => {
    // arrange
    const repository = new PostgresAssessmentCallRepository(
      createDatabaseRejecting(createDatabaseError({ code: "22P02" })),
    );

    // act
    const call = await repository.findById("not-an-identifier");

    // assert
    expect(call).toBeNull();
  });

  it("reports the reserved start instants from the given moment", async () => {
    // arrange
    const repository = new PostgresAssessmentCallRepository(
      createDatabaseReturning([
        { startsAt: new Date("2026-10-01T14:00:00.000Z") },
        { startsAt: new Date("2026-10-02T15:00:00.000Z") },
      ]),
    );

    // act
    const reservedStarts = await repository.reservedStartsFrom(
      new Date("2026-09-18T09:30:00.000Z"),
    );

    // assert
    expect(reservedStarts).toEqual([
      new Date("2026-10-01T14:00:00.000Z"),
      new Date("2026-10-02T15:00:00.000Z"),
    ]);
  });
});

describe("PostgresAssessmentCallRepository start index race", () => {
  it("reports the slot as taken when another booking wins the start index", async () => {
    // arrange
    const database = createDatabaseReturning([STORED_ROW]);
    database.transaction = vi.fn().mockRejectedValue(
      createDatabaseError({
        code: "23505",
        constraint: "assessment_calls_starts_at_unique",
      }),
    );
    const repository = new PostgresAssessmentCallRepository(database);

    // act
    const result = await repository.reserve(reserveCommand());

    // assert
    expect(result.status).toBe("slot_taken");
    expect(
      result.status === "slot_taken" ? result.existing.visitorEmail : null,
    ).toBe("ana@example.com");
  });

  it("rethrows a unique violation raised by another constraint", async () => {
    // arrange
    const unrelatedViolation = createDatabaseError({
      code: "23505",
      constraint: "assessment_calls_pkey",
    });
    const database = createDatabaseReturning([STORED_ROW]);
    database.transaction = vi.fn().mockRejectedValue(unrelatedViolation);
    const repository = new PostgresAssessmentCallRepository(database);

    // act
    const result = repository.reserve(reserveCommand());

    // assert
    await expect(result).rejects.toBe(unrelatedViolation);
  });

  it("rethrows the original violation when the winning row cannot be read back", async () => {
    // arrange
    const startsAtViolation = createDatabaseError({
      code: "23505",
      constraint: "assessment_calls_starts_at_unique",
    });
    const database = createDatabaseReturning([]);
    database.transaction = vi.fn().mockRejectedValue(startsAtViolation);
    const repository = new PostgresAssessmentCallRepository(database);

    // act
    const result = repository.reserve(reserveCommand());

    // assert
    await expect(result).rejects.toBe(startsAtViolation);
  });
});

function reserveCommand() {
  return {
    bookedAt: new Date("2026-09-18T09:30:00.000Z"),
    coachTimeZone: "Europe/Bucharest",
    fullName: "Ana Popescu",
    normalizedEmail: "ana@example.com",
    notes: null,
    now: new Date("2026-09-18T09:30:00.000Z"),
    startsAt: new Date("2026-10-01T14:00:00.000Z"),
    visitorTimeZone: "Europe/Bucharest",
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
