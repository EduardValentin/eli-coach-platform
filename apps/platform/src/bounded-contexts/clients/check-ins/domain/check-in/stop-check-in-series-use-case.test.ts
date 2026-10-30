import { describe, expect, it, vi } from "vitest";

import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort, ClientReachReading } from "./client-reach-port";

import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import type {
  CheckInSeriesRecordsPort,
  CheckInSeriesStop,
} from "./check-in-series-records-port";
import { StopCheckInSeriesUseCase } from "./stop-check-in-series-use-case";

const NOW = new Date("2026-10-13T12:00:00.000Z");
const CHANGED_AT = new Date("2026-10-10T12:00:00.000Z");

const ANA = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
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
  changedAt: CHANGED_AT,
  stoppedAt: null,
} satisfies CheckInSeriesSnapshot;

const ANA_REACH: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: new Date("2026-10-06T09:00:00.000Z"),
  paidThrough: new Date("2026-11-05T09:00:00.000Z"),
  timeZone: "Europe/London",
};

const NEXT_WEDNESDAY_SIX_PM = new Date("2026-10-14T15:00:00.000Z");

function createStop(options?: {
  found?: CheckInSeries | null;
  stopped?: CheckInSeriesStop;
}) {
  const series = {
    find: vi
      .fn()
      .mockResolvedValue(
        options?.found === undefined
          ? CheckInSeries.reconstitute(SERIES)
          : options.found,
      ),
    stop: vi.fn().mockResolvedValue(
      options?.stopped ?? {
        status: "stopped",
        cancelledIds: [],
        freedReservationIds: ["reservation-1", "reservation-2"],
      },
    ),
  } satisfies Pick<CheckInSeriesRecordsPort, "find" | "stop">;
  const identities = {
    findByClientIds: vi.fn().mockResolvedValue([ANA]),
  } satisfies Pick<ClientIdentitiesPort, "findByClientIds">;
  const notifications = {
    requested: vi.fn(),
    withdrawn: vi.fn(),
    approved: vi.fn(),
    declined: vi.fn(),
    newTimeProposed: vi.fn(),
    newTimeAccepted: vi.fn(),
    newTimeDeclined: vi.fn(),
    cancelled: vi.fn(),
    seriesSetUp: vi.fn(),
    seriesChanged: vi.fn(),
    seriesStopped: vi.fn().mockResolvedValue("sent"),
  } satisfies CheckInNotificationsPort;
  const clients = {
    findById: vi.fn().mockResolvedValue(ANA_REACH),
  } satisfies Pick<ClientReachPort, "findById">;
  const ports = {
    clientReachPort: clients,
    clockPort: { now: () => NOW },
    coachTimePort: { release: vi.fn().mockResolvedValue(undefined) },
    clientIdentitiesPort: identities,
    checkInIncidentsPort: {
      checkInNotificationFailed: vi.fn(),
      awaitingCheckInsCountFailed: vi.fn(),
      awaitingCheckInsListFailed: vi.fn(),
      nextCheckInLookupFailed: vi.fn(),
      checkInSeriesNotificationFailed: vi.fn(),
      checkInSeriesExtensionFailed: vi.fn(),
      checkInSeriesReadFailed: vi.fn(),
      checkInInboxFailed: vi.fn(),
      checkInSeriesInboxFailed: vi.fn(),
    },
    checkInInboxPort: {
      checkInEvent: vi.fn().mockResolvedValue(undefined),
      seriesEvent: vi.fn().mockResolvedValue(undefined),
      clashesAdded: vi.fn().mockResolvedValue(undefined),
      scheduleExpiries: vi.fn().mockResolvedValue(undefined),
    },
    checkInNotificationsPort: notifications,
    checkInSeriesRecordsPort: series,
  };

  return {
    ports,
    stopCheckInSeriesUseCase: new StopCheckInSeriesUseCase(ports),
  };
}

describe("StopCheckInSeriesUseCase", () => {
  it("stops the series it read at the clock's instant in one write and emails the client", async () => {
    // arrange
    const { ports, stopCheckInSeriesUseCase } = createStop();

    // act
    const result = await stopCheckInSeriesUseCase.execute({
      seriesId: "series-1",
    });

    // assert
    const stopped = { ...SERIES, stoppedAt: NOW };
    expect(result).toEqual({ status: "stopped", series: stopped });
    expect(ports.checkInSeriesRecordsPort.stop).toHaveBeenCalledWith({
      seriesId: "series-1",
      expected: { changedAt: CHANGED_AT },
      at: NOW,
    });
    expect(ports.coachTimePort.release).toHaveBeenCalledWith("reservation-1");
    expect(ports.coachTimePort.release).toHaveBeenCalledWith("reservation-2");
    expect(ports.checkInNotificationsPort.seriesStopped).toHaveBeenCalledWith({
      series: stopped,
      weekStartsAt: NEXT_WEDNESDAY_SIX_PM,
      clientTimeZone: "Europe/London",
      client: ANA,
      recipient: "client",
    });
  });

  it("writes the stop to her inbox without a week to open", async () => {
    // arrange
    const { ports, stopCheckInSeriesUseCase } = createStop();

    // act
    await stopCheckInSeriesUseCase.execute({ seriesId: "series-1" });

    // assert
    expect(ports.checkInInboxPort.seriesEvent).toHaveBeenCalledWith(
      "seriesStopped",
      {
        series: { ...SERIES, stoppedAt: NOW },
        weekStartsAt: NEXT_WEDNESDAY_SIX_PM,
        clientTimeZone: "Europe/London",
        client: ANA,
        recipient: "client",
        firstWeekId: null,
      },
    );
  });

  it("answers changed_meanwhile without emailing when the series changed since it was read", async () => {
    // arrange
    const { ports, stopCheckInSeriesUseCase } = createStop({
      stopped: { status: "changed_meanwhile" },
    });

    // act
    const result = await stopCheckInSeriesUseCase.execute({
      seriesId: "series-1",
    });

    // assert
    expect(result).toEqual({ status: "changed_meanwhile" });
    expect(ports.checkInNotificationsPort.seriesStopped).not.toHaveBeenCalled();
  });

  it.each([
    { situation: "an unknown series", found: null },
    {
      situation: "a series already stopped",
      found: CheckInSeries.reconstitute({ ...SERIES, stoppedAt: CHANGED_AT }),
    },
  ])("refuses $situation without writing", async ({ found }) => {
    // arrange
    const { ports, stopCheckInSeriesUseCase } = createStop({ found });

    // act
    const result = await stopCheckInSeriesUseCase.execute({
      seriesId: "series-1",
    });

    // assert
    expect(result).toEqual({ status: "unknown_series" });
    expect(ports.checkInSeriesRecordsPort.stop).not.toHaveBeenCalled();
  });

  it("reads her zone before it stops, so a failed read changes nothing", async () => {
    // arrange
    const failure = new Error("connection refused");
    const { ports, stopCheckInSeriesUseCase } = createStop();
    ports.clientReachPort.findById.mockRejectedValue(failure);

    // act
    const stopping = stopCheckInSeriesUseCase.execute({ seriesId: "series-1" });

    // assert
    await expect(stopping).rejects.toBe(failure);
    expect(ports.checkInSeriesRecordsPort.stop).not.toHaveBeenCalled();
  });

  it("keeps the stop and reports the email that failed", async () => {
    // arrange
    const { ports, stopCheckInSeriesUseCase } = createStop();
    ports.checkInNotificationsPort.seriesStopped.mockResolvedValue("failed");

    // act
    const result = await stopCheckInSeriesUseCase.execute({
      seriesId: "series-1",
    });

    // assert
    expect(result.status).toBe("stopped");
    expect(
      ports.checkInIncidentsPort.checkInSeriesNotificationFailed,
    ).toHaveBeenCalledWith({
      seriesId: "series-1",
      notification: "seriesStopped",
    });
  });
});
