import { describe, expect, it, vi } from "vitest";

import { reserveCoachTime } from "./coach-time-reservations.server";
import { COACH_TIME_RESERVATIONS_NO_OVERLAP } from "../schema.server";

type Transaction = Parameters<typeof reserveCoachTime>[0];

const RESERVATION = {
  start: new Date("2026-10-19T14:00:00.000Z"),
  end: new Date("2026-10-19T15:00:00.000Z"),
  appointmentKind: "assessment_call",
  appointmentId: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
} as const;

describe("reserveCoachTime", () => {
  it("reserves the coach's time when nothing overlaps it", async () => {
    // arrange
    const transaction = createTransactionSettling(Promise.resolve());

    // act
    const result = await reserveCoachTime(transaction, RESERVATION);

    // assert
    expect(result).toEqual({ status: "reserved" });
  });

  it("reports the time taken when the no-overlap constraint refuses it", async () => {
    // arrange
    const transaction = createTransactionSettling(
      Promise.reject(
        wrappedDatabaseError({
          code: "23P01",
          constraint: COACH_TIME_RESERVATIONS_NO_OVERLAP,
        }),
      ),
    );

    // act
    const result = await reserveCoachTime(transaction, RESERVATION);

    // assert
    expect(result).toEqual({ status: "taken" });
  });

  it.each([
    [{ code: "23P01", constraint: "another_exclusion" }],
    [{ code: "23514", constraint: COACH_TIME_RESERVATIONS_NO_OVERLAP }],
    [{ code: "08006" }],
  ])("rethrows the database error %o", async (fields) => {
    // arrange
    const failure = wrappedDatabaseError(fields);
    const transaction = createTransactionSettling(Promise.reject(failure));

    // act
    const result = reserveCoachTime(transaction, RESERVATION);

    // assert
    await expect(result).rejects.toBe(failure);
  });
});

function createTransactionSettling(outcome: Promise<unknown>): Transaction {
  outcome.catch(() => undefined);

  return {
    transaction: vi.fn().mockReturnValue(outcome),
  } as unknown as Transaction;
}

function wrappedDatabaseError(fields: {
  code: string;
  constraint?: string;
}): Error {
  return new Error("Failed query", {
    cause: Object.assign(new Error(`Database error ${fields.code}`), fields),
  });
}
