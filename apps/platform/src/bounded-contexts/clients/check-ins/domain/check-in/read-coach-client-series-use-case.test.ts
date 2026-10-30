import { describe, expect, it, vi } from "vitest";

import type { ClientReachPort, ClientReachReading } from "./client-reach-port";

import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecordsPort } from "./check-in-series-records-port";
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
  } satisfies Pick<ClientReachPort, "findById">;
  const series = {
    findActiveForClient: vi.fn().mockResolvedValue(options.active),
  } satisfies Pick<CheckInSeriesRecordsPort, "findActiveForClient">;
  const ports = {
    clientReachPort: clients,
    checkInIncidentsPort: { checkInSeriesReadFailed: vi.fn() },
    checkInSeriesRecordsPort: series,
  };

  return {
    ports,
    readCoachClientSeriesUseCase: new ReadCoachClientSeriesUseCase(ports),
  };
}

describe("ReadCoachClientSeriesUseCase", () => {
  it("reads no series and reports the failure when her series cannot be read", async () => {
    // arrange
    const failure = new Error("database down");
    const { ports, readCoachClientSeriesUseCase } = createRead({
      active: null,
    });
    ports.checkInSeriesRecordsPort.findActiveForClient.mockRejectedValue(
      failure,
    );

    // act
    const result = await readCoachClientSeriesUseCase.execute("client-1");

    // assert
    expect(result).toEqual({
      series: null,
      coachingEnds: false,
    });
    expect(
      ports.checkInIncidentsPort.checkInSeriesReadFailed,
    ).toHaveBeenCalledWith({
      clientId: "client-1",
      error: failure,
    });
  });

  it("reads her active series", async () => {
    // arrange
    const { ports, readCoachClientSeriesUseCase } = createRead({
      active: CheckInSeries.reconstitute(SERIES),
    });

    // act
    const result = await readCoachClientSeriesUseCase.execute("client-1");

    // assert
    expect(
      ports.checkInSeriesRecordsPort.findActiveForClient,
    ).toHaveBeenCalledWith("client-1");
    expect(result).toEqual({ series: SERIES, coachingEnds: false });
  });

  it("reads no series for a client without an active series", async () => {
    // arrange
    const { readCoachClientSeriesUseCase } = createRead({ active: null });

    // act
    const result = await readCoachClientSeriesUseCase.execute("client-1");

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
      const { readCoachClientSeriesUseCase } = createRead({
        active: null,
        client,
      });

      // act
      const result = await readCoachClientSeriesUseCase.execute("client-1");

      // assert
      expect(result).toEqual({
        series: null,
        coachingEnds: true,
      });
    },
  );
});
