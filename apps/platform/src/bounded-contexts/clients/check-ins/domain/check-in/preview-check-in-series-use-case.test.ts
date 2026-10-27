import { describe, expect, it, vi } from "vitest";

import type { ClientReach, ClientReachReading } from "./client-reach";

import { CheckIn } from "./check-in";
import { CheckInSeries } from "./check-in-series";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import type { CoachTimeSpan } from "./coach-time";
import { CoachWeek, type OpenSlots } from "./open-slots";
import { PreviewCheckInSeriesUseCase } from "./preview-check-in-series-use-case";

const NOW = new Date("2026-10-05T09:00:00.000Z");

const ANA_REACH: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: NOW,
  paidThrough: new Date("2026-11-05T09:00:00.000Z"),
  timeZone: "Europe/London",
};

const HELD_WEDNESDAY_SIX_PM: CoachTimeSpan = {
  start: new Date("2026-10-14T15:00:00.000Z"),
  end: new Date("2026-10-14T16:00:00.000Z"),
};

const HELD_WEDNESDAY_SEVEN_PM: CoachTimeSpan = {
  start: new Date("2026-10-28T17:00:00.000Z"),
  end: new Date("2026-10-28T18:00:00.000Z"),
};

const ANA_SERIES = CheckInSeries.reconstitute({
  id: "series-1",
  clientId: "client-1",
  weekday: "wednesday",
  hour: 18,
  timeZone: "Europe/Bucharest",
  coversFrom: NOW,
  coversUntil: new Date("2026-11-05T09:00:00.000Z"),
  setUpAt: NOW,
  changedAt: null,
  stoppedAt: null,
});

function seriesWeekAt(startsAt: Date): CheckIn {
  return CheckIn.seriesOccurrence({
    id: `week-${startsAt.toISOString()}`,
    seriesId: ANA_SERIES.id,
    clientId: "client-1",
    startsAt,
    clientTimeZone: "Europe/London",
    coachTimeZone: "Europe/Bucharest",
    at: NOW,
  });
}

function createPreview(
  client: ClientReachReading | null = ANA_REACH,
  activeSeries: { series: CheckInSeries; weeks: CheckIn[] } | null = null,
) {
  const openSlots = {
    coachWeek: vi.fn().mockResolvedValue(
      CoachWeek.of({
        timeZone: "Europe/Bucharest",
        weekdays: ["monday", "wednesday", "friday"],
        hours: [17, 18, 19],
      }),
    ),
    busyFrom: vi
      .fn()
      .mockResolvedValue([HELD_WEDNESDAY_SIX_PM, HELD_WEDNESDAY_SEVEN_PM]),
  } satisfies Pick<OpenSlots, "coachWeek" | "busyFrom">;
  const clients = {
    findById: vi.fn().mockResolvedValue(client),
  } satisfies Pick<ClientReach, "findById">;
  const series = {
    findActiveForClient: vi
      .fn()
      .mockResolvedValue(activeSeries?.series ?? null),
    listOccurrences: vi.fn().mockResolvedValue(activeSeries?.weeks ?? []),
  } satisfies Pick<
    CheckInSeriesRecords,
    "findActiveForClient" | "listOccurrences"
  >;
  const ports = {
    clients,
    clock: { now: () => NOW },
    openSlots,
    series,
  };

  return { ports, preview: new PreviewCheckInSeriesUseCase(ports) };
}

describe("PreviewCheckInSeriesUseCase", () => {
  it("offers the coach's weekdays and every hour of her window with its weeks and the ones already taken", async () => {
    // arrange
    const { ports, preview } = createPreview();

    // act
    const result = await preview.execute({
      clientId: "client-1",
      weekday: "wednesday",
    });

    // assert
    expect(result).toEqual({
      status: "previewed",
      weekdays: ["monday", "wednesday", "friday"],
      hours: [
        { hour: 17, occurrences: 5, clashes: 0 },
        { hour: 18, occurrences: 5, clashes: 1 },
        { hour: 19, occurrences: 5, clashes: 1 },
      ],
    });
    expect(ports.openSlots.busyFrom).toHaveBeenCalledWith(NOW);
  });

  it("leaves the hours her own weekly check-in holds out of the clashes, since a change replaces them", async () => {
    // arrange
    const { preview } = createPreview(ANA_REACH, {
      series: ANA_SERIES,
      weeks: [seriesWeekAt(HELD_WEDNESDAY_SIX_PM.start)],
    });

    // act
    const result = await preview.execute({
      clientId: "client-1",
      weekday: "wednesday",
    });

    // assert
    expect(result).toMatchObject({
      status: "previewed",
      hours: [
        { hour: 17, occurrences: 5, clashes: 0 },
        { hour: 18, occurrences: 5, clashes: 0 },
        { hour: 19, occurrences: 5, clashes: 1 },
      ],
    });
  });

  it("still counts an hour her own weekly check-in no longer holds", async () => {
    // arrange
    const { preview } = createPreview(ANA_REACH, {
      series: ANA_SERIES,
      weeks: [seriesWeekAt(HELD_WEDNESDAY_SIX_PM.start).asClash()],
    });

    // act
    const result = await preview.execute({
      clientId: "client-1",
      weekday: "wednesday",
    });

    // assert
    expect(result).toMatchObject({
      hours: [
        { hour: 17, clashes: 0 },
        { hour: 18, clashes: 1 },
        { hour: 19, clashes: 1 },
      ],
    });
  });

  it("offers every hour with no week when her paid period has none left", async () => {
    // arrange
    const { preview } = createPreview({
      ...ANA_REACH,
      paidThrough: new Date("2026-10-06T08:00:00.000Z"),
    });

    // act
    const result = await preview.execute({
      clientId: "client-1",
      weekday: "wednesday",
    });

    // assert
    expect(result).toMatchObject({
      status: "previewed",
      hours: [
        { hour: 17, occurrences: 0, clashes: 0 },
        { hour: 18, occurrences: 0, clashes: 0 },
        { hour: 19, occurrences: 0, clashes: 0 },
      ],
    });
  });

  it.each([
    { situation: "an unknown client", client: null, status: "unknown_client" },
    {
      situation: "a client still onboarding",
      client: { ...ANA_REACH, portal: "awaiting_onboarding" },
      status: "client_cannot_answer",
    },
    {
      situation: "a client without a paid period",
      client: { ...ANA_REACH, programStartsAt: null, paidThrough: null },
      status: "client_cannot_answer",
    },
    {
      situation: "a client whose coaching is cancelled and ends later",
      client: {
        ...ANA_REACH,
        coachingEndsAt: new Date("2026-12-01T10:00:00.000Z"),
      },
      status: "client_cannot_answer",
    },
  ] as const)("refuses $situation as $status", async ({ client, status }) => {
    // arrange
    const { ports, preview } = createPreview(client);

    // act
    const result = await preview.execute({
      clientId: "client-1",
      weekday: "wednesday",
    });

    // assert
    expect(result).toEqual({ status });
    expect(ports.openSlots.busyFrom).not.toHaveBeenCalled();
  });
});
