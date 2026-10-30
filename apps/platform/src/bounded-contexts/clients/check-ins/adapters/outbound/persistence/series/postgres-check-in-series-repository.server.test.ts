import type { DatabaseClient } from "~/shared/database";
import {
  CheckInSeries,
  type CheckInSeriesSnapshot,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import { describe, expect, it, vi } from "vitest";

import { checkInConstraints } from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/schema.server";

import { PostgresCheckInSeriesRepository } from "./postgres-check-in-series-repository.server";

const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const SET_UP_AT = new Date("2026-10-13T08:00:00.000Z");

const SERIES_ROW: CheckInSeriesSnapshot = {
  id: "3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a",
  clientId: CLIENT_ID,
  weekday: "wednesday",
  hour: 18,
  timeZone: "Europe/Bucharest",
  coversFrom: new Date("2026-10-14T08:00:00.000Z"),
  coversUntil: new Date("2027-01-13T08:00:00.000Z"),
  setUpAt: SET_UP_AT,
  changedAt: null,
  stoppedAt: null,
};

const WEEK_ROW = {
  id: "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c",
  seriesId: SERIES_ROW.id,
  clientId: CLIENT_ID,
  startsAt: new Date("2026-10-14T15:00:00.000Z"),
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "recurring",
  status: "approved",
  initiatedBy: "coach",
  proposedBy: "coach",
  note: null,
  requestedAt: SET_UP_AT,
  answeredAt: SET_UP_AT,
  earlierStartsAt: null,
  moves: 0,
  newTimeNote: null,
};

describe("PostgresCheckInSeries#find", () => {
  it("maps a stored row into the series the domain reads", async () => {
    // arrange
    const postgresCheckInSeriesRepository = seriesOver(
      createDatabaseReturning([SERIES_ROW]),
    );

    // act
    const series = await postgresCheckInSeriesRepository.find(SERIES_ROW.id);

    // assert
    expect(series?.toSnapshot()).toEqual(SERIES_ROW);
  });

  it("finds no series for an identifier that matches no row", async () => {
    // arrange
    const postgresCheckInSeriesRepository = seriesOver(
      createDatabaseReturning([]),
    );

    // act
    const series = await postgresCheckInSeriesRepository.find(SERIES_ROW.id);

    // assert
    expect(series).toBeNull();
  });
});

describe("PostgresCheckInSeries#findActiveForClient", () => {
  it("maps the client's series that is not stopped", async () => {
    // arrange
    const postgresCheckInSeriesRepository = seriesOver(
      createDatabaseReturning([SERIES_ROW]),
    );

    // act
    const series =
      await postgresCheckInSeriesRepository.findActiveForClient(CLIENT_ID);

    // assert
    expect(series?.id).toBe(SERIES_ROW.id);
    expect(series?.isStopped()).toBe(false);
  });
});

describe("PostgresCheckInSeries#listOccurrences", () => {
  it("maps every week of the series into the check-ins the domain reads", async () => {
    // arrange
    const postgresCheckInSeriesRepository = seriesOver(
      createDatabaseReturning([WEEK_ROW]),
    );

    // act
    const weeks = await postgresCheckInSeriesRepository.listOccurrences(
      SERIES_ROW.id,
    );

    // assert
    expect(weeks.map((week) => week.toSnapshot())).toEqual([
      expect.objectContaining({
        id: WEEK_ROW.id,
        seriesId: SERIES_ROW.id,
        kind: "recurring",
        recordedStatus: "approved",
      }),
    ]);
  });
});

describe("PostgresCheckInSeries#start", () => {
  it("answers that a series exists when the one-active-series index refuses the insert", async () => {
    // arrange
    const postgresCheckInSeriesRepository = seriesOver(
      createDatabaseFailingTransactions(
        Object.assign(new Error("duplicate key value"), {
          cause: {
            code: "23505",
            constraint: checkInConstraints.activeSeriesPerClient,
          },
        }),
      ),
    );

    // act
    const result = await postgresCheckInSeriesRepository.start(
      CheckInSeries.reconstitute(SERIES_ROW),
    );

    // assert
    expect(result).toBe("series_exists");
  });

  it("rethrows any other failure of the set-up transaction", async () => {
    // arrange
    const failure = new Error("connection reset");
    const postgresCheckInSeriesRepository = seriesOver(
      createDatabaseFailingTransactions(failure),
    );

    // act
    const start = postgresCheckInSeriesRepository.start(
      CheckInSeries.reconstitute(SERIES_ROW),
    );

    // assert
    await expect(start).rejects.toBe(failure);
  });
});

function seriesOver(database: DatabaseClient) {
  return new PostgresCheckInSeriesRepository(database);
}

function createDatabaseReturning(rows: readonly unknown[]): DatabaseClient {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    then: (onFulfilled: (value: readonly unknown[]) => unknown) =>
      Promise.resolve(rows).then(onFulfilled),
  };

  return {
    select: vi.fn().mockReturnValue(chain),
  } as unknown as DatabaseClient;
}

function createDatabaseFailingTransactions(failure: Error): DatabaseClient {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn().mockRejectedValue(failure),
  } as unknown as DatabaseClient;
}
