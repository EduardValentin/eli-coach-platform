import { describe, expect, it, vi } from "vitest";

import type {
  ClientIdentities,
  ClientReach,
  ClientReachReading,
} from "~/bounded-contexts/clients/clients/domain/client";
import { CoachAvailability } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";

import { ChangeCheckInSeriesUseCase } from "./change-check-in-series-use-case";
import { CheckIn } from "./check-in";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import type {
  CheckInSeriesChangeResult,
  CheckInSeriesRecords,
} from "./check-in-series-records";

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

function availabilityOf() {
  const result = CoachAvailability.from({
    timeZone: "Europe/Bucharest",
    weekdays: ["monday", "wednesday", "friday"],
    startHour: 9,
    endHour: 20,
  });

  if (result.status !== "configured") {
    throw new Error(`expected a configured availability: ${result.problems}`);
  }

  return { current: vi.fn().mockResolvedValue(result.availability) };
}

function createChange(options?: {
  found?: CheckInSeries | null;
  client?: ClientReachReading | null;
  recorded?: CheckInSeriesChangeResult;
}) {
  let generated = 0;
  const series = {
    find: vi
      .fn()
      .mockResolvedValue(
        options?.found === undefined
          ? CheckInSeries.reconstitute(SERIES)
          : options.found,
      ),
    change: vi.fn(
      async (
        command: Parameters<CheckInSeriesRecords["change"]>[0],
      ): Promise<CheckInSeriesChangeResult> =>
        options?.recorded ?? {
          status: "changed",
          occurrences: command.occurrences.map(({ checkIn }) => checkIn),
        },
    ),
  } satisfies Pick<CheckInSeriesRecords, "find" | "change">;
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
    availability: availabilityOf(),
    clients,
    clock: { now: () => TUESDAY_NOON },
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
    },
    notifications,
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
    expect(
      command.occurrences.map(({ checkIn, availability }) => ({
        availability,
        startsAt: checkIn.startsAt.toISOString(),
        seriesId: checkIn.seriesId,
        recordedStatus: checkIn.recordedStatus,
        clientTimeZone: checkIn.clientTimeZone,
      })),
    ).toEqual(
      FRIDAY_STARTS.map((startsAt) => ({
        availability: "open",
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
    const weekOf = (id: string, startsAt: string) =>
      CheckIn.seriesOccurrence({
        id,
        seriesId: "series-1",
        clientId: "client-1",
        startsAt: new Date(startsAt),
        clientTimeZone: "Europe/London",
        coachTimeZone: "Europe/Bucharest",
        at: TUESDAY_NOON,
      });
    const { change, ports } = createChange({
      recorded: {
        status: "changed",
        occurrences: [
          weekOf("week-2", FRIDAY_STARTS[1]),
          weekOf("week-1", FRIDAY_STARTS[0]),
        ],
      },
    });

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
      recorded: { status: "changed", occurrences: [] },
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
