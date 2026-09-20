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
      createDatabaseReturning([STORED_ROW, laterRow]),
    );

    // act
    const calls = await repository.listAll();

    // assert
    expect(calls.map((call) => call.toSnapshot())).toEqual([
      {
        id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
        visitorName: "Ana Popescu",
        visitorEmail: "ana@example.com",
        visitorNotes: "Training three times a week.",
        startsAt: new Date("2026-10-01T14:00:00.000Z"),
        endsAt: new Date("2026-10-01T14:30:00.000Z"),
        visitorTimeZone: "Europe/Bucharest",
        coachTimeZone: "Europe/Bucharest",
        bookedAt: new Date("2026-09-18T09:30:00.000Z"),
      },
      {
        id: "9c2b7d41-0e58-4a17-8c6f-2d4e7b9a1f03",
        visitorName: "Ana Popescu",
        visitorEmail: "ana@example.com",
        visitorNotes: "Training three times a week.",
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
      createDatabaseReturning([]),
    );

    // act
    const calls = await repository.listAll();

    // assert
    expect(calls).toEqual([]);
  });
});

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
