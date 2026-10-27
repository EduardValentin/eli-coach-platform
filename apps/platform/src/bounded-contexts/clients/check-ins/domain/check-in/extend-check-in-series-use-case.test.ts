import { describe, expect, it, vi } from "vitest";

import type {
  ClientIdentities,
  ClientReach,
  ClientReachReading,
} from "~/bounded-contexts/clients/clients/domain/client";

import type { CheckInInbox } from "./check-in-inbox";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import type { HeldCheckIn } from "./check-ins";
import type { CoachTime, CoachTimeHold } from "./coach-time";
import { ExtendCheckInSeriesUseCase } from "./extend-check-in-series-use-case";
import { CoachWeek, type OpenSlots } from "./open-slots";
import type { Weekday } from "./weekdays";

const SET_UP_AT = new Date("2026-10-05T09:00:00.000Z");
const COVERS_FROM = new Date("2026-10-06T09:00:00.000Z");
const COVERS_UNTIL = new Date("2026-11-05T09:00:00.000Z");
const RENEWED_THROUGH = new Date("2026-12-05T09:00:00.000Z");
const RENEWAL_DAY = new Date("2026-11-03T09:00:00.000Z");

const SERIES = {
  id: "series-1",
  clientId: "client-1",
  weekday: "wednesday",
  hour: 18,
  timeZone: "Europe/Bucharest",
  coversFrom: COVERS_FROM,
  coversUntil: COVERS_UNTIL,
  setUpAt: SET_UP_AT,
  changedAt: null,
  stoppedAt: null,
} satisfies CheckInSeriesSnapshot;

const RENEWED_REACH: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: SET_UP_AT,
  paidThrough: RENEWED_THROUGH,
  timeZone: "Europe/London",
};

const ANA = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
};

const RENEWED_WEEKS = [
  "2026-11-11T16:00:00.000Z",
  "2026-11-18T16:00:00.000Z",
  "2026-11-25T16:00:00.000Z",
  "2026-12-02T16:00:00.000Z",
];

function openSlotsOn(weekdays: Weekday[]) {
  return {
    coachWeek: vi.fn().mockResolvedValue(
      CoachWeek.of({
        timeZone: "Europe/Bucharest",
        weekdays,
        hours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      }),
    ),
  } satisfies Pick<OpenSlots, "coachWeek">;
}

function createExtend(options?: {
  active?: CheckInSeries | null;
  client?: ClientReachReading | null;
  now?: Date;
  weekdays?: Weekday[];
  clashingWeeks?: number[];
}) {
  let generated = 0;
  let attempted = 0;
  const series = {
    findActiveForClient: vi
      .fn()
      .mockResolvedValue(
        options?.active === undefined
          ? CheckInSeries.reconstitute(SERIES)
          : options.active,
      ),
    widen: vi.fn<CheckInSeriesRecords["widen"]>().mockResolvedValue("widened"),
    recordWeeks: vi
      .fn<CheckInSeriesRecords["recordWeeks"]>()
      .mockResolvedValue(undefined),
  } satisfies Pick<
    CheckInSeriesRecords,
    "findActiveForClient" | "widen" | "recordWeeks"
  >;
  const coachTime = {
    reserve: vi.fn(async (): Promise<CoachTimeHold> => {
      const week = attempted;
      attempted += 1;

      return options?.clashingWeeks?.includes(week)
        ? { status: "taken" }
        : { status: "reserved", reservationId: `reservation-${week + 1}` };
    }),
    release: vi.fn().mockResolvedValue(undefined),
  } satisfies CoachTime;
  const clients = {
    findById: vi
      .fn()
      .mockResolvedValue(
        options?.client === undefined ? RENEWED_REACH : options.client,
      ),
  } satisfies Pick<ClientReach, "findById">;
  const incidents = {
    checkInNotificationFailed: vi.fn(),
    awaitingCheckInsCountFailed: vi.fn(),
    awaitingCheckInsListFailed: vi.fn(),
    nextCheckInLookupFailed: vi.fn(),
    checkInSeriesNotificationFailed: vi.fn(),
    checkInSeriesExtensionFailed: vi.fn(),
    checkInSeriesReadFailed: vi.fn(),
    checkInInboxFailed: vi.fn(),
    checkInSeriesInboxFailed: vi.fn(),
  };
  const identities = {
    findByClientIds: vi.fn().mockResolvedValue([ANA]),
  } satisfies Pick<ClientIdentities, "findByClientIds">;
  const inbox = {
    checkInEvent: vi.fn().mockResolvedValue(undefined),
    seriesEvent: vi.fn().mockResolvedValue(undefined),
    clashesAdded: vi.fn().mockResolvedValue(undefined),
  } satisfies CheckInInbox;
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
    seriesStopped: vi.fn(),
  } satisfies CheckInNotifications;
  const now = options?.now ?? RENEWAL_DAY;
  const ports = {
    clients,
    clock: { now: () => now },
    coachTime,
    identities,
    ids: { generate: () => `week-${(generated += 1)}` },
    inbox,
    incidents,
    notifications,
    openSlots: openSlotsOn(
      options?.weekdays ?? ["monday", "wednesday", "friday"],
    ),
    series,
  };

  return { extend: new ExtendCheckInSeriesUseCase(ports), ports };
}

function recordedWeeksOf(ports: ReturnType<typeof createExtend>["ports"]) {
  const [weeks] = ports.series.recordWeeks.mock.calls[0];

  return weeks;
}

function weeksOf(weeks: readonly HeldCheckIn[]) {
  return weeks.map(({ checkIn }) => ({
    startsAt: checkIn.startsAt.toISOString(),
    recordedStatus: checkIn.recordedStatus,
  }));
}

describe("ExtendCheckInSeriesUseCase", () => {
  it("adds the renewed period's weeks to her active series in one write against the cover it read", async () => {
    // arrange
    const { extend, ports } = createExtend();

    // act
    const result = await extend.execute({ clientId: "client-1" });

    // assert
    expect(result).toEqual({ status: "extended", created: 4 });
    expect(ports.series.findActiveForClient).toHaveBeenCalledWith("client-1");
    const [command] = ports.series.widen.mock.calls[0];
    expect(command.series.toSnapshot()).toEqual({
      ...SERIES,
      coversUntil: RENEWED_THROUGH,
    });
    expect(command.expected).toEqual({
      coversFrom: COVERS_FROM,
      coversUntil: COVERS_UNTIL,
    });
    const weeks = recordedWeeksOf(ports);
    expect(weeksOf(weeks)).toEqual(
      RENEWED_WEEKS.map((startsAt) => ({
        startsAt,
        recordedStatus: "approved",
      })),
    );
    expect(weeks.map(({ reservationId }) => reservationId)).toEqual([
      "reservation-1",
      "reservation-2",
      "reservation-3",
      "reservation-4",
    ]);
    expect(
      weeks.every(
        ({ checkIn }) =>
          checkIn.seriesId === "series-1" &&
          checkIn.kind === "recurring" &&
          checkIn.clientTimeZone === "Europe/London",
      ),
    ).toBe(true);
  });

  it("adds the weeks between an early program start and the first week", async () => {
    // arrange
    const startedNow = new Date("2026-10-05T09:00:00.000Z");
    const { extend, ports } = createExtend({
      active: CheckInSeries.reconstitute({
        ...SERIES,
        coversFrom: new Date("2026-10-19T09:00:00.000Z"),
      }),
      client: {
        ...RENEWED_REACH,
        programStartsAt: startedNow,
        paidThrough: COVERS_UNTIL,
      },
      now: startedNow,
    });

    // act
    const result = await extend.execute({ clientId: "client-1" });

    // assert
    expect(result).toEqual({ status: "extended", created: 2 });
    const [command] = ports.series.widen.mock.calls[0];
    expect(weeksOf(recordedWeeksOf(ports))).toEqual([
      { startsAt: "2026-10-07T15:00:00.000Z", recordedStatus: "approved" },
      { startsAt: "2026-10-14T15:00:00.000Z", recordedStatus: "approved" },
    ]);
    expect(command.series.coversFrom).toEqual(COVERS_FROM);
  });

  it("adds the weeks as clashes when the series hour is no longer inside the coach's availability", async () => {
    // arrange
    const { extend, ports } = createExtend({ weekdays: ["monday"] });

    // act
    await extend.execute({ clientId: "client-1" });

    // assert
    expect(weeksOf(recordedWeeksOf(ports))).toEqual(
      RENEWED_WEEKS.map((startsAt) => ({ startsAt, recordedStatus: "clash" })),
    );
    expect(ports.coachTime.reserve).not.toHaveBeenCalled();
  });

  it("writes one clash notice to the coach's inbox with the count and the earliest clashing week", async () => {
    // arrange
    const { extend, ports } = createExtend({ clashingWeeks: [3, 1] });

    // act
    const result = await extend.execute({ clientId: "client-1" });

    // assert
    expect(result).toEqual({ status: "extended", created: 4 });
    expect(ports.inbox.clashesAdded).toHaveBeenCalledOnce();
    expect(ports.inbox.clashesAdded).toHaveBeenCalledWith({
      series: { ...SERIES, coversUntil: RENEWED_THROUGH },
      client: ANA,
      clashes: 2,
      earliest: { id: "week-2", startsAt: new Date(RENEWED_WEEKS[1]) },
    });
    expect(
      Object.values(ports.notifications).every(
        (send) => send.mock.calls.length === 0,
      ),
    ).toBe(true);
  });

  it("writes no clash notice when the added weeks hold no clash", async () => {
    // arrange
    const { extend, ports } = createExtend();

    // act
    await extend.execute({ clientId: "client-1" });

    // assert
    expect(ports.inbox.clashesAdded).not.toHaveBeenCalled();
    expect(ports.identities.findByClientIds).not.toHaveBeenCalled();
  });

  it.each([
    { situation: "a client without an active series", active: null },
    {
      situation: "a client whose coaching ended",
      client: { ...RENEWED_REACH, portal: "ended" },
    },
    {
      situation: "a client whose coaching is cancelled and ends later",
      client: { ...RENEWED_REACH, coachingEndsAt: COVERS_UNTIL },
    },
    { situation: "a client who no longer exists", client: null },
    {
      situation: "a paid period the series already covers",
      client: { ...RENEWED_REACH, paidThrough: COVERS_UNTIL },
    },
  ] as const)("has nothing to add for $situation", async (situation) => {
    // arrange
    const { extend, ports } = createExtend(situation);

    // act
    const result = await extend.execute({ clientId: "client-1" });

    // assert
    expect(result).toEqual({ status: "nothing_to_add" });
    expect(ports.series.widen).not.toHaveBeenCalled();
    expect(ports.inbox.clashesAdded).not.toHaveBeenCalled();
  });

  it("re-reads once when the series changed meanwhile", async () => {
    // arrange
    const { extend, ports } = createExtend();
    ports.series.widen.mockResolvedValueOnce("changed_meanwhile");

    // act
    const result = await extend.execute({ clientId: "client-1" });

    // assert
    expect(result).toEqual({ status: "extended", created: 4 });
    expect(ports.series.findActiveForClient).toHaveBeenCalledTimes(2);
  });

  it("reports and answers failed when the series keeps changing", async () => {
    // arrange
    const { extend, ports } = createExtend();
    ports.series.widen.mockResolvedValue("changed_meanwhile");

    // act
    const result = await extend.execute({ clientId: "client-1" });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(ports.series.widen).toHaveBeenCalledTimes(2);
    expect(ports.inbox.clashesAdded).not.toHaveBeenCalled();
    expect(ports.incidents.checkInSeriesExtensionFailed).toHaveBeenCalledOnce();
    expect(ports.incidents.checkInSeriesExtensionFailed).toHaveBeenCalledWith({
      clientId: "client-1",
      error: expect.any(Error),
    });
  });

  it("reports a failed read or write and answers failed without throwing", async () => {
    // arrange
    const failure = new Error("connection refused");
    const { extend, ports } = createExtend();
    ports.series.widen.mockRejectedValue(failure);

    // act
    const result = await extend.execute({ clientId: "client-1" });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(ports.incidents.checkInSeriesExtensionFailed).toHaveBeenCalledWith({
      clientId: "client-1",
      error: failure,
    });
  });
});
