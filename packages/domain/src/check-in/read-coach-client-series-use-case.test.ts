import { describe, expect, it, vi } from "vitest";

import type {
  ClientIdentities,
  ClientIdentity,
  ClientReach,
  ClientReachReading,
} from "../client";

import { CheckIn, type CheckInProps } from "./check-in";
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import { ReadCoachClientSeriesUseCase } from "./read-coach-client-series-use-case";

const NOW = new Date("2026-10-13T12:00:00.000Z");

const ANA: ClientIdentity = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: null,
};

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

const WEEK = {
  id: "week-0",
  seriesId: "series-1",
  clientId: "client-1",
  startsAt: new Date("2026-10-07T15:00:00.000Z"),
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "recurring",
  recordedStatus: "approved",
  initiatedBy: "coach",
  proposedBy: "coach",
  note: null,
  requestedAt: new Date("2026-10-05T09:00:00.000Z"),
  answeredAt: new Date("2026-10-05T09:00:00.000Z"),
  earlierStartsAt: null,
  moves: 0,
  newTimeNote: null,
} satisfies CheckInProps;

function weekOf(week: number, props?: Partial<CheckInProps>): CheckIn {
  return CheckIn.reconstitute({
    ...WEEK,
    id: `week-${week}`,
    startsAt: new Date(WEEK.startsAt.getTime() + week * 7 * 86_400_000),
    ...props,
  });
}

function createRead(options: {
  active: CheckInSeries | null;
  occurrences?: CheckIn[];
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
    listOccurrences: vi.fn().mockResolvedValue(options.occurrences ?? []),
  } satisfies Pick<
    CheckInSeriesRecords,
    "findActiveForClient" | "listOccurrences"
  >;
  const identities = {
    findByClientIds: vi.fn().mockResolvedValue([ANA]),
  } satisfies Pick<ClientIdentities, "findByClientIds">;
  const ports = {
    clients,
    clock: { now: () => NOW },
    identities,
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
      occurrences: [],
      coachingEnds: false,
    });
    expect(ports.incidents.checkInSeriesReadFailed).toHaveBeenCalledWith({
      clientId: "client-1",
      error: failure,
    });
  });

  it("reads her active series with every week still to come for the coach, soonest first, untrimmed", async () => {
    // arrange
    const { ports, read } = createRead({
      active: CheckInSeries.reconstitute(SERIES),
      occurrences: [
        weekOf(3),
        weekOf(0),
        weekOf(1, { recordedStatus: "clash" }),
        weekOf(2, { recordedStatus: "pending", proposedBy: "client" }),
        weekOf(4, { recordedStatus: "cancelled" }),
      ],
    });

    // act
    const result = await read.execute("client-1");

    // assert
    expect(ports.series.findActiveForClient).toHaveBeenCalledWith("client-1");
    expect(ports.series.listOccurrences).toHaveBeenCalledWith("series-1");
    expect(result.series).toEqual(SERIES);
    expect(result.coachingEnds).toBe(false);
    expect(
      result.occurrences.map((view) => [view.id, view.tab, view.client]),
    ).toEqual([
      ["week-1", "requests", { firstName: "Ana", lastName: "Popescu" }],
      ["week-2", "requests", { firstName: "Ana", lastName: "Popescu" }],
      ["week-3", "upcoming", { firstName: "Ana", lastName: "Popescu" }],
    ]);
  });

  it("reads no series and no week for a client without an active series", async () => {
    // arrange
    const { ports, read } = createRead({ active: null });

    // act
    const result = await read.execute("client-1");

    // assert
    expect(result).toEqual({
      series: null,
      occurrences: [],
      coachingEnds: false,
    });
    expect(ports.series.listOccurrences).not.toHaveBeenCalled();
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
        occurrences: [],
        coachingEnds: true,
      });
    },
  );
});
