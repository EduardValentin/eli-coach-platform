import { describe, expect, it, vi } from "vitest";

import type { ClientIdentities } from "./client-identities";
import type { ClientReach, ClientReachReading } from "./client-reach";

import { ChangeCheckInSeriesUseCase } from "./change-check-in-series-use-case";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import type {
  CheckInSeriesChange,
  CheckInSeriesRecords,
} from "./check-in-series-records";
import type { CoachTime, CoachTimeHold } from "./coach-time";
import { CoachWeek, type OpenSlots } from "./open-slots";

const TUESDAY_NOON = new Date("2026-10-13T12:00:00.000Z");

const ANA = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
};

const ANA_REACH: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: new Date("2026-10-05T09:00:00.000Z"),
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

const FRIDAY_MORNINGS = {
  seriesId: "series-1",
  weekday: "friday",
  hour: 10,
} as const;

const FRIDAY_STARTS = [
  "2026-10-16T07:00:00.000Z",
  "2026-10-23T07:00:00.000Z",
  "2026-10-30T08:00:00.000Z",
];

function openSlotsOf() {
  return {
    coachWeek: vi.fn().mockResolvedValue(
      CoachWeek.of({
        timeZone: "Europe/Bucharest",
        weekdays: ["monday", "wednesday", "friday"],
        hours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      }),
    ),
  } satisfies Pick<OpenSlots, "coachWeek">;
}

function createChange(options?: {
  found?: CheckInSeries | null;
  client?: ClientReachReading | null;
  recorded?: CheckInSeriesChange;
}) {
  let generated = 0;
  let reserved = 0;
  const series = {
    find: vi
      .fn()
      .mockResolvedValue(
        options?.found === undefined
          ? CheckInSeries.reconstitute(SERIES)
          : options.found,
      ),
    change: vi.fn<CheckInSeriesRecords["change"]>().mockResolvedValue(
      options?.recorded ?? {
        status: "changed",
        cancelledIds: [],
        freedReservationIds: ["reservation-wednesday"],
      },
    ),
    recordWeeks: vi
      .fn<CheckInSeriesRecords["recordWeeks"]>()
      .mockResolvedValue(undefined),
  } satisfies Pick<CheckInSeriesRecords, "find" | "change" | "recordWeeks">;
  const coachTime = {
    reserve: vi.fn(async (): Promise<CoachTimeHold> => ({
      status: "reserved",
      reservationId: `reservation-${(reserved += 1)}`,
    })),
    release: vi.fn().mockResolvedValue(undefined),
  } satisfies CoachTime;
  const clients = {
    findById: vi
      .fn()
      .mockResolvedValue(
        options?.client === undefined ? ANA_REACH : options.client,
      ),
  } satisfies Pick<ClientReach, "findById">;
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
    seriesChanged: vi.fn().mockResolvedValue("sent"),
    seriesStopped: vi.fn(),
  } satisfies CheckInNotifications;
  const ports = {
    clients,
    clock: { now: () => TUESDAY_NOON },
    coachTime,
    identities,
    ids: { generate: () => `week-${(generated += 1)}` },
    incidents: {
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
    inbox: {
      checkInEvent: vi.fn().mockResolvedValue(undefined),
      seriesEvent: vi.fn().mockResolvedValue(undefined),
      clashesAdded: vi.fn().mockResolvedValue(undefined),
      scheduleExpiries: vi.fn().mockResolvedValue(undefined),
    },
    notifications,
    openSlots: openSlotsOf(),
    series,
  };

  return { change: new ChangeCheckInSeriesUseCase(ports), ports };
}

describe("ChangeCheckInSeriesUseCase", () => {
  it("replaces every week to come with the new day and hour from the next matching day, in one write against the series it read", async () => {
    // arrange
    const { change, ports } = createChange();

    // act
    const result = await change.execute(FRIDAY_MORNINGS);

    // assert
    const [command] = ports.series.change.mock.calls[0];
    expect(command).toMatchObject({
      expected: { changedAt: null, weekday: "wednesday", hour: 18 },
      startsFrom: TUESDAY_NOON,
      at: TUESDAY_NOON,
    });
    const changed = {
      ...SERIES,
      weekday: "friday",
      hour: 10,
      changedAt: TUESDAY_NOON,
    };
    expect(command.series.toSnapshot()).toEqual(changed);
    expect(ports.coachTime.release).toHaveBeenCalledWith(
      "reservation-wednesday",
    );
    const [weeks] = ports.series.recordWeeks.mock.calls[0];
    expect(
      weeks.map(({ checkIn, reservationId }) => ({
        reservationId,
        startsAt: checkIn.startsAt.toISOString(),
        seriesId: checkIn.seriesId,
        recordedStatus: checkIn.recordedStatus,
        clientTimeZone: checkIn.clientTimeZone,
      })),
    ).toEqual(
      FRIDAY_STARTS.map((startsAt, week) => ({
        reservationId: `reservation-${week + 1}`,
        startsAt,
        seriesId: "series-1",
        recordedStatus: "approved",
        clientTimeZone: "Europe/London",
      })),
    );
    expect(result).toMatchObject({ status: "changed", series: changed });
  });

  it("emails the client the changed series and its first week", async () => {
    // arrange
    const { change, ports } = createChange();

    // act
    await change.execute(FRIDAY_MORNINGS);

    // assert
    expect(ports.notifications.seriesChanged).toHaveBeenCalledWith({
      series: expect.objectContaining({ weekday: "friday", hour: 10 }),
      weekStartsAt: new Date(FRIDAY_STARTS[0]),
      clientTimeZone: "Europe/London",
      client: ANA,
      recipient: "client",
    });
  });

  it("writes the changed series to her inbox, opening her earliest new week", async () => {
    // arrange
    const { change, ports } = createChange();

    // act
    await change.execute(FRIDAY_MORNINGS);

    // assert
    expect(ports.inbox.seriesEvent).toHaveBeenCalledWith("seriesChanged", {
      series: expect.objectContaining({ weekday: "friday", hour: 10 }),
      weekStartsAt: new Date(FRIDAY_STARTS[0]),
      clientTimeZone: "Europe/London",
      client: ANA,
      recipient: "client",
      firstWeekId: "week-1",
    });
  });

  it("writes the changed series to her inbox without a week to open when no new week was recorded", async () => {
    // arrange
    const { change, ports } = createChange({
      found: CheckInSeries.reconstitute({
        ...SERIES,
        coversUntil: new Date("2026-10-14T00:00:00.000Z"),
      }),
    });

    // act
    await change.execute(FRIDAY_MORNINGS);

    // assert
    expect(ports.inbox.seriesEvent).toHaveBeenCalledWith(
      "seriesChanged",
      expect.objectContaining({ firstWeekId: null }),
    );
  });

  it("answers changed_meanwhile without emailing when the series changed since it was read", async () => {
    // arrange
    const { change, ports } = createChange({
      recorded: { status: "changed_meanwhile" },
    });

    // act
    const result = await change.execute(FRIDAY_MORNINGS);

    // assert
    expect(result).toEqual({ status: "changed_meanwhile" });
    expect(ports.coachTime.reserve).not.toHaveBeenCalled();
    expect(ports.notifications.seriesChanged).not.toHaveBeenCalled();
  });

  it.each([
    { situation: "an unknown series", found: null, status: "unknown_series" },
    {
      situation: "a stopped series",
      found: CheckInSeries.reconstitute({
        ...SERIES,
        stoppedAt: new Date("2026-10-10T09:00:00.000Z"),
      }),
      status: "unknown_series",
    },
  ] as const)(
    "refuses $situation as $status without writing",
    async ({ found, status }) => {
      // arrange
      const { change, ports } = createChange({ found });

      // act
      const result = await change.execute(FRIDAY_MORNINGS);

      // assert
      expect(result).toEqual({ status });
      expect(ports.series.change).not.toHaveBeenCalled();
    },
  );

  it.each([
    { situation: "who no longer exists", client: null },
    {
      situation: "whose coaching ended",
      client: { ...ANA_REACH, portal: "ended" },
    },
    {
      situation: "whose coaching is cancelled and ends later",
      client: {
        ...ANA_REACH,
        coachingEndsAt: new Date("2026-12-01T10:00:00.000Z"),
      },
    },
  ] as const)(
    "refuses changing the series of a client $situation",
    async ({ client }) => {
      // arrange
      const { change, ports } = createChange({ client });

      // act
      const result = await change.execute(FRIDAY_MORNINGS);

      // assert
      expect(result).toEqual({ status: "client_cannot_answer" });
      expect(ports.series.change).not.toHaveBeenCalled();
    },
  );

  it("refuses a day or hour outside the coach's availability", async () => {
    // arrange
    const { change, ports } = createChange();

    // act
    const result = await change.execute({ ...FRIDAY_MORNINGS, hour: 8 });

    // assert
    expect(result).toEqual({ status: "outside_availability" });
    expect(ports.series.change).not.toHaveBeenCalled();
  });
});
