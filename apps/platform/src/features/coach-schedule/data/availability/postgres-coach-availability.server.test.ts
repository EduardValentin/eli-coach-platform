import {
  CoachAvailability,
  type CoachAvailabilityProps,
} from "@eli-coach-platform/domain/coach-availability";
import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it, vi } from "vitest";

import { coachAvailabilityTable } from "../schema.server";
import { PostgresCoachAvailability } from "./postgres-coach-availability.server";

const NOW = new Date("2026-09-19T12:00:00.000Z");
const clock = { now: () => NOW };

const STORED_ROW = {
  id: 1,
  timeZone: "Europe/Chisinau",
  weekdays: ["monday", "wednesday"],
  startHour: 9,
  endHour: 12,
  updatedAt: new Date("2026-09-18T08:00:00.000Z"),
};

function configuredAvailabilityOrThrow(
  props: CoachAvailabilityProps,
): CoachAvailability {
  const result = CoachAvailability.from(props);

  if (result.status !== "configured") {
    throw new Error(
      `Expected a configured availability, got problems: ${result.problems.join(", ")}`,
    );
  }

  return result.availability;
}

describe("PostgresCoachAvailability#current", () => {
  it("rebuilds the availability the stored row holds", async () => {
    // arrange
    const availability = new PostgresCoachAvailability({
      database: createDatabaseReturning([STORED_ROW]),
      clock,
    });

    // act
    const current = await availability.current();

    // assert
    expect({
      timeZone: current.timeZone,
      weekdays: current.weekdays,
      startHour: current.startHour,
      endHour: current.endHour,
    }).toEqual({
      timeZone: "Europe/Chisinau",
      weekdays: ["monday", "wednesday"],
      startHour: 9,
      endHour: 12,
    });
  });

  it("answers Monday to Friday, 17 to 20, Europe/Bucharest when no row exists", async () => {
    // arrange
    const availability = new PostgresCoachAvailability({
      database: createDatabaseReturning([]),
      clock,
    });

    // act
    const current = await availability.current();

    // assert
    expect({
      timeZone: current.timeZone,
      weekdays: current.weekdays,
      startHour: current.startHour,
      endHour: current.endHour,
    }).toEqual({
      timeZone: "Europe/Bucharest",
      weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      startHour: 17,
      endHour: 20,
    });
  });

  it("throws when a stored row fails to rebuild", async () => {
    // arrange
    const availability = new PostgresCoachAvailability({
      database: createDatabaseReturning([
        { ...STORED_ROW, startHour: 20, endHour: 17 },
      ]),
      clock,
    });

    // act
    const current = availability.current();

    // assert
    await expect(current).rejects.toThrow(/validation/i);
  });
});

describe("PostgresCoachAvailability#save", () => {
  it("upserts the singleton row and stamps updated_at from the clock", async () => {
    // arrange
    const database = createUpsertingDatabase();
    const availability = new PostgresCoachAvailability({
      database: database.client,
      clock,
    });

    // act
    await availability.save(
      configuredAvailabilityOrThrow({
        timeZone: "Europe/Bucharest",
        weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        startHour: 17,
        endHour: 20,
      }),
    );

    // assert
    expect(database.values).toHaveBeenCalledWith({
      id: 1,
      timeZone: "Europe/Bucharest",
      weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      startHour: 17,
      endHour: 20,
      updatedAt: NOW,
    });
    expect(database.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ target: coachAvailabilityTable.id }),
    );
  });
});

function createDatabaseReturning(rows: readonly unknown[]): DatabaseClient {
  return {
    select: vi.fn().mockReturnValue(createSelectChain(rows)),
  } as unknown as DatabaseClient;
}

function createSelectChain(rows: readonly unknown[]) {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    then: (onFulfilled: (value: readonly unknown[]) => unknown) =>
      Promise.resolve(rows).then(onFulfilled),
  };

  return chain;
}

function createUpsertingDatabase(): {
  client: DatabaseClient;
  values: ReturnType<typeof vi.fn>;
  onConflictDoUpdate: ReturnType<typeof vi.fn>;
} {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  const insert = vi.fn().mockReturnValue({ values });

  return {
    client: { insert } as unknown as DatabaseClient,
    values,
    onConflictDoUpdate,
  };
}
