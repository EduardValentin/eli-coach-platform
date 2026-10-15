import { describe, expect, it, vi } from "vitest";

import type { ClientReach, ClientReachReading } from "../client";

import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import { ReadCoachClientSeriesUseCase } from "./read-coach-client-series-use-case";

const ANA_REACH: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: new Date("2026-10-06T09:00:00.000Z"),
  paidThrough: new Date("2026-11-05T09:00:00.000Z"),
  timeZone: "Europe/London",
};

const SERIES = {
  id: "series-1",
  clientId: "client-1",
  weekday: "wednesday",
  hour: 18,
  timeZone: "Europe/Bucharest",
  coversFrom: new Date("2026-10-06T09:00:00.000Z"),
  coversUntil: new Date("2026-11-05T09:00:00.000Z"),
  setUpAt: new Date("2026-10-05T09:00:00.000Z"),
  changedAt: null,
  stoppedAt: null,
} satisfies CheckInSeriesSnapshot;

function createRead(options: {
  active: CheckInSeries | null;
  client?: ClientReachReading | null;
}) {
  const clients = {
    findById: vi
      .fn()
      .mockResolvedValue(
        options.client === undefined ? ANA_REACH : options.client,
      ),
  } satisfies Pick<ClientReach, "findById">;
  const series = {
    findActiveForClient: vi.fn().mockResolvedValue(options.active),
  } satisfies Pick<CheckInSeriesRecords, "findActiveForClient">;
  const ports = {
    clients,
    incidents: { checkInSeriesReadFailed: vi.fn() },
    series,
  };

  return { ports, read: new ReadCoachClientSeriesUseCase(ports) };
}

describe("ReadCoachClientSeriesUseCase", () => {
  it("reads no series and reports the failure when her series cannot be read", async () => {
    // arrange
    const failure = new Error("database down");
    const { ports, read } = createRead({ active: null });
    ports.series.findActiveForClient.mockRejectedValue(failure);

    // act
    const result = await read.execute("client-1");

    // assert
    expect(result).toEqual({
      series: null,
      coachingEnds: false,
    });
    expect(ports.incidents.checkInSeriesReadFailed).toHaveBeenCalledWith({
      clientId: "client-1",
      error: failure,
    });
  });

  it("reads her active series", async () => {
    // arrange
    const { ports, read } = createRead({
      active: CheckInSeries.reconstitute(SERIES),
    });

    // act
    const result = await read.execute("client-1");

    // assert
    expect(ports.series.findActiveForClient).toHaveBeenCalledWith("client-1");
    expect(result).toEqual({ series: SERIES, coachingEnds: false });
  });

  it("reads no series for a client without an active series", async () => {
    // arrange
    const { read } = createRead({ active: null });

    // act
    const result = await read.execute("client-1");

    // assert
    expect(result).toEqual({
      series: null,
      coachingEnds: false,
    });
  });

  it.each([
    {
      situation: "cancelled and ends later",
      client: {
        ...ANA_REACH,
        coachingEndsAt: new Date("2026-12-01T10:00:00.000Z"),
      },
    },
    {
      situation: "ended",
      client: {
        ...ANA_REACH,
        portal: "ended",
        coachingEndsAt: new Date("2026-10-10T10:00:00.000Z"),
      },
    },
  ] as const)(
    "reads that her coaching ends when it is $situation",
    async ({ client }) => {
      // arrange
      const { read } = createRead({ active: null, client });

      // act
      const result = await read.execute("client-1");

      // assert
      expect(result).toEqual({
        series: null,
        coachingEnds: true,
      });
    },
  );
});
