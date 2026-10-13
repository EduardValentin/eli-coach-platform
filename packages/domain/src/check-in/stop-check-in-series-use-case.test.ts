import { describe, expect, it, vi } from "vitest";

import type { ClientIdentities } from "../client";

import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecords } from "./check-in-series-records";
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

function createStop(options?: {
  found?: CheckInSeries | null;
  stopped?: "stopped" | "changed_meanwhile";
}) {
  const series = {
    find: vi
      .fn()
      .mockResolvedValue(
        options?.found === undefined
          ? CheckInSeries.reconstitute(SERIES)
          : options.found,
      ),
    stop: vi.fn().mockResolvedValue(options?.stopped ?? "stopped"),
  } satisfies Pick<CheckInSeriesRecords, "find" | "stop">;
  const identities = {
    findByClientIds: vi.fn().mockResolvedValue([ANA]),
  } satisfies Pick<ClientIdentities, "findByClientIds">;
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
  } satisfies CheckInNotifications;
  const ports = {
    clock: { now: () => NOW },
    identities,
    incidents: {
      checkInNotificationFailed: vi.fn(),
      awaitingCheckInsCountFailed: vi.fn(),
      awaitingCheckInsListFailed: vi.fn(),
      nextCheckInLookupFailed: vi.fn(),
      checkInSeriesNotificationFailed: vi.fn(),
      checkInSeriesExtensionFailed: vi.fn(),
    },
    notifications,
    series,
  };

  return { ports, stop: new StopCheckInSeriesUseCase(ports) };
}

describe("StopCheckInSeriesUseCase", () => {
  it("stops the series it read at the clock's instant in one write and emails the client", async () => {
    // arrange
    const { ports, stop } = createStop();

    // act
    const result = await stop.execute({ seriesId: "series-1" });

    // assert
    const stopped = { ...SERIES, stoppedAt: NOW };
    expect(result).toEqual({ status: "stopped", series: stopped });
    expect(ports.series.stop).toHaveBeenCalledWith({
      seriesId: "series-1",
      expected: { changedAt: CHANGED_AT },
      at: NOW,
    });
    expect(ports.notifications.seriesStopped).toHaveBeenCalledWith({
      series: stopped,
      firstOccurrenceAt: null,
      client: ANA,
      recipient: "client",
    });
  });

  it("answers changed_meanwhile without emailing when the series changed since it was read", async () => {
    // arrange
    const { ports, stop } = createStop({ stopped: "changed_meanwhile" });

    // act
    const result = await stop.execute({ seriesId: "series-1" });

    // assert
    expect(result).toEqual({ status: "changed_meanwhile" });
    expect(ports.notifications.seriesStopped).not.toHaveBeenCalled();
  });

  it.each([
    { situation: "an unknown series", found: null },
    {
      situation: "a series already stopped",
      found: CheckInSeries.reconstitute({ ...SERIES, stoppedAt: CHANGED_AT }),
    },
  ])("refuses $situation without writing", async ({ found }) => {
    // arrange
    const { ports, stop } = createStop({ found });

    // act
    const result = await stop.execute({ seriesId: "series-1" });

    // assert
    expect(result).toEqual({ status: "unknown_series" });
    expect(ports.series.stop).not.toHaveBeenCalled();
  });

  it("keeps the stop and reports the email that failed", async () => {
    // arrange
    const { ports, stop } = createStop();
    ports.notifications.seriesStopped.mockResolvedValue("failed");

    // act
    const result = await stop.execute({ seriesId: "series-1" });

    // assert
    expect(result.status).toBe("stopped");
    expect(
      ports.incidents.checkInSeriesNotificationFailed,
    ).toHaveBeenCalledWith({
      seriesId: "series-1",
      notification: "seriesStopped",
    });
  });
});
