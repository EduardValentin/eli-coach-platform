import { describe, expect, it, vi } from "vitest";

import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort, ClientReachReading } from "./client-reach-port";

import type { CheckInInboxPort } from "./check-in-inbox-port";
import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecordsPort } from "./check-in-series-records-port";
import type { HeldCheckIn } from "./check-ins-port";
import type { CoachTimePort, CoachTimeHold } from "./coach-time-port";
import { ExtendCheckInSeriesUseCase } from "./extend-check-in-series-use-case";
import { CoachWeek } from "./open-slots";
import { type OpenSlotsPort } from "./open-slots-port";
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
  } satisfies Pick<OpenSlotsPort, "coachWeek">;
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
    widen: vi
      .fn<CheckInSeriesRecordsPort["widen"]>()
      .mockResolvedValue("widened"),
    recordWeeks: vi
      .fn<CheckInSeriesRecordsPort["recordWeeks"]>()
      .mockResolvedValue(undefined),
  } satisfies Pick<
    CheckInSeriesRecordsPort,
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
  } satisfies CoachTimePort;
  const clients = {
    findById: vi
      .fn()
      .mockResolvedValue(
        options?.client === undefined ? RENEWED_REACH : options.client,
      ),
  } satisfies Pick<ClientReachPort, "findById">;
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
  } satisfies Pick<ClientIdentitiesPort, "findByClientIds">;
  const inbox = {
    checkInEvent: vi.fn().mockResolvedValue(undefined),
    seriesEvent: vi.fn().mockResolvedValue(undefined),
    clashesAdded: vi.fn().mockResolvedValue(undefined),
    scheduleExpiries: vi.fn().mockResolvedValue(undefined),
  } satisfies CheckInInboxPort;
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
  } satisfies CheckInNotificationsPort;
  const now = options?.now ?? RENEWAL_DAY;
  const ports = {
    clientReachPort: clients,
    clockPort: { now: () => now },
    coachTimePort: coachTime,
    clientIdentitiesPort: identities,
    checkInIdsPort: { generate: () => `week-${(generated += 1)}` },
    checkInInboxPort: inbox,
    checkInIncidentsPort: incidents,
    checkInNotificationsPort: notifications,
    openSlotsPort: openSlotsOn(
      options?.weekdays ?? ["monday", "wednesday", "friday"],
    ),
    checkInSeriesRecordsPort: series,
  };

  return {
    extendCheckInSeriesUseCase: new ExtendCheckInSeriesUseCase(ports),
    ports,
  };
}

function recordedWeeksOf(ports: ReturnType<typeof createExtend>["ports"]) {
  const [weeks] = ports.checkInSeriesRecordsPort.recordWeeks.mock.calls[0];

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
    const { extendCheckInSeriesUseCase, ports } = createExtend();

    // act
    const result = await extendCheckInSeriesUseCase.execute({
      clientId: "client-1",
    });

    // assert
    expect(result).toEqual({ status: "extended", created: 4 });
    expect(
      ports.checkInSeriesRecordsPort.findActiveForClient,
    ).toHaveBeenCalledWith("client-1");
    const [command] = ports.checkInSeriesRecordsPort.widen.mock.calls[0];
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
    const { extendCheckInSeriesUseCase, ports } = createExtend({
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
    const result = await extendCheckInSeriesUseCase.execute({
      clientId: "client-1",
    });

    // assert
    expect(result).toEqual({ status: "extended", created: 2 });
    const [command] = ports.checkInSeriesRecordsPort.widen.mock.calls[0];
    expect(weeksOf(recordedWeeksOf(ports))).toEqual([
      { startsAt: "2026-10-07T15:00:00.000Z", recordedStatus: "approved" },
      { startsAt: "2026-10-14T15:00:00.000Z", recordedStatus: "approved" },
    ]);
    expect(command.series.coversFrom).toEqual(COVERS_FROM);
  });

  it("adds the weeks as clashes when the series hour is no longer inside the coach's availability", async () => {
    // arrange
    const { extendCheckInSeriesUseCase, ports } = createExtend({
      weekdays: ["monday"],
    });

    // act
    await extendCheckInSeriesUseCase.execute({ clientId: "client-1" });

    // assert
    expect(weeksOf(recordedWeeksOf(ports))).toEqual(
      RENEWED_WEEKS.map((startsAt) => ({ startsAt, recordedStatus: "clash" })),
    );
    expect(ports.coachTimePort.reserve).not.toHaveBeenCalled();
  });

  it("writes one clash notice to the coach's inbox with the count and the earliest clashing week", async () => {
    // arrange
    const { extendCheckInSeriesUseCase, ports } = createExtend({
      clashingWeeks: [3, 1],
    });

    // act
    const result = await extendCheckInSeriesUseCase.execute({
      clientId: "client-1",
    });

    // assert
    expect(result).toEqual({ status: "extended", created: 4 });
    expect(ports.checkInInboxPort.clashesAdded).toHaveBeenCalledOnce();
    expect(ports.checkInInboxPort.clashesAdded).toHaveBeenCalledWith({
      series: { ...SERIES, coversUntil: RENEWED_THROUGH },
      client: ANA,
      clashes: 2,
      earliest: { id: "week-2", startsAt: new Date(RENEWED_WEEKS[1]) },
    });
    expect(
      Object.values(ports.checkInNotificationsPort).every(
        (send) => send.mock.calls.length === 0,
      ),
    ).toBe(true);
  });

  it("writes no clash notice when the added weeks hold no clash", async () => {
    // arrange
    const { extendCheckInSeriesUseCase, ports } = createExtend();

    // act
    await extendCheckInSeriesUseCase.execute({ clientId: "client-1" });

    // assert
    expect(ports.checkInInboxPort.clashesAdded).not.toHaveBeenCalled();
    expect(ports.clientIdentitiesPort.findByClientIds).not.toHaveBeenCalled();
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
    const { extendCheckInSeriesUseCase, ports } = createExtend(situation);

    // act
    const result = await extendCheckInSeriesUseCase.execute({
      clientId: "client-1",
    });

    // assert
    expect(result).toEqual({ status: "nothing_to_add" });
    expect(ports.checkInSeriesRecordsPort.widen).not.toHaveBeenCalled();
    expect(ports.checkInInboxPort.clashesAdded).not.toHaveBeenCalled();
  });

  it("re-reads once when the series changed meanwhile", async () => {
    // arrange
    const { extendCheckInSeriesUseCase, ports } = createExtend();
    ports.checkInSeriesRecordsPort.widen.mockResolvedValueOnce(
      "changed_meanwhile",
    );

    // act
    const result = await extendCheckInSeriesUseCase.execute({
      clientId: "client-1",
    });

    // assert
    expect(result).toEqual({ status: "extended", created: 4 });
    expect(
      ports.checkInSeriesRecordsPort.findActiveForClient,
    ).toHaveBeenCalledTimes(2);
  });

  it("reports and answers failed when the series keeps changing", async () => {
    // arrange
    const { extendCheckInSeriesUseCase, ports } = createExtend();
    ports.checkInSeriesRecordsPort.widen.mockResolvedValue("changed_meanwhile");

    // act
    const result = await extendCheckInSeriesUseCase.execute({
      clientId: "client-1",
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(ports.checkInSeriesRecordsPort.widen).toHaveBeenCalledTimes(2);
    expect(ports.checkInInboxPort.clashesAdded).not.toHaveBeenCalled();
    expect(
      ports.checkInIncidentsPort.checkInSeriesExtensionFailed,
    ).toHaveBeenCalledOnce();
    expect(
      ports.checkInIncidentsPort.checkInSeriesExtensionFailed,
    ).toHaveBeenCalledWith({
      clientId: "client-1",
      error: expect.any(Error),
    });
  });

  it("rethrows a failed read or write so its caller rolls the extension back before reporting it", async () => {
    // arrange
    const failure = new Error("connection refused");
    const { extendCheckInSeriesUseCase, ports } = createExtend();
    ports.checkInSeriesRecordsPort.widen.mockRejectedValue(failure);

    // act
    const extending = extendCheckInSeriesUseCase.execute({
      clientId: "client-1",
    });

    // assert
    await expect(extending).rejects.toBe(failure);
    expect(
      ports.checkInIncidentsPort.checkInSeriesExtensionFailed,
    ).not.toHaveBeenCalled();
  });
});
