import { describe, expect, it, vi } from "vitest";

import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort, ClientReachReading } from "./client-reach-port";

import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import { CheckInSeries } from "./check-in-series";
import type { CheckInSeriesRecordsPort } from "./check-in-series-records-port";
import type { CoachTimePort, CoachTimeHold } from "./coach-time-port";
import { CoachWeek } from "./open-slots";
import { type OpenSlotsPort } from "./open-slots-port";
import { SetUpCheckInSeriesUseCase } from "./set-up-check-in-series-use-case";

const NOW = new Date("2026-10-05T09:00:00.000Z");
const A_DAY_LATER = new Date("2026-10-06T09:00:00.000Z");
const PAID_THROUGH = new Date("2026-11-05T09:00:00.000Z");

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
  programStartsAt: NOW,
  paidThrough: PAID_THROUGH,
  timeZone: "Europe/London",
};

const WEDNESDAY_EVENINGS = {
  clientId: "client-1",
  weekday: "wednesday",
  hour: 18,
} as const;

const WEEK_STARTS = [
  "2026-10-07T15:00:00.000Z",
  "2026-10-14T15:00:00.000Z",
  "2026-10-21T15:00:00.000Z",
  "2026-10-28T16:00:00.000Z",
  "2026-11-04T16:00:00.000Z",
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
  } satisfies Pick<OpenSlotsPort, "coachWeek">;
}

function createSetUp(options?: {
  client?: ClientReachReading | null;
  started?: "started" | "series_exists";
  hold?: CoachTimeHold;
}) {
  let generated = 0;
  let reserved = 0;
  const series = {
    start: vi.fn().mockResolvedValue(options?.started ?? "started"),
    recordWeeks: vi
      .fn<CheckInSeriesRecordsPort["recordWeeks"]>()
      .mockResolvedValue(undefined),
  } satisfies Pick<CheckInSeriesRecordsPort, "start" | "recordWeeks">;
  const coachTime = {
    reserve: vi.fn(
      async (): Promise<CoachTimeHold> =>
        options?.hold ?? {
          status: "reserved",
          reservationId: `reservation-${(reserved += 1)}`,
        },
    ),
    release: vi.fn().mockResolvedValue(undefined),
  } satisfies CoachTimePort;
  const clients = {
    findById: vi
      .fn()
      .mockResolvedValue(
        options?.client === undefined ? ANA_REACH : options.client,
      ),
  } satisfies Pick<ClientReachPort, "findById">;
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
    seriesSetUp: vi.fn().mockResolvedValue("sent"),
    seriesChanged: vi.fn(),
    seriesStopped: vi.fn(),
  } satisfies CheckInNotificationsPort;
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
  const ports = {
    clientReachPort: clients,
    clockPort: { now: () => NOW },
    coachTimePort: coachTime,
    clientIdentitiesPort: identities,
    checkInIdsPort: { generate: () => `id-${(generated += 1)}` },
    checkInIncidentsPort: incidents,
    checkInInboxPort: {
      checkInEvent: vi.fn().mockResolvedValue(undefined),
      seriesEvent: vi.fn().mockResolvedValue(undefined),
      clashesAdded: vi.fn().mockResolvedValue(undefined),
      scheduleExpiries: vi.fn().mockResolvedValue(undefined),
    },
    checkInNotificationsPort: notifications,
    openSlotsPort: openSlotsOf(),
    checkInSeriesRecordsPort: series,
  };

  return {
    ports,
    setUpCheckInSeriesUseCase: new SetUpCheckInSeriesUseCase(ports),
  };
}

describe("SetUpCheckInSeriesUseCase", () => {
  it("records the series with one approved week per week of her paid period, in one write", async () => {
    // arrange
    const { ports, setUpCheckInSeriesUseCase } = createSetUp();

    // act
    const result = await setUpCheckInSeriesUseCase.execute(WEDNESDAY_EVENINGS);

    // assert
    const [series] = ports.checkInSeriesRecordsPort.start.mock.calls[0];
    const [weeks] = ports.checkInSeriesRecordsPort.recordWeeks.mock.calls[0];
    expect(series).toBeInstanceOf(CheckInSeries);
    expect(series.toSnapshot()).toEqual({
      id: "id-1",
      clientId: "client-1",
      weekday: "wednesday",
      hour: 18,
      timeZone: "Europe/Bucharest",
      coversFrom: A_DAY_LATER,
      coversUntil: PAID_THROUGH,
      setUpAt: NOW,
      changedAt: null,
      stoppedAt: null,
    });
    expect(
      weeks.map(({ checkIn, reservationId }) => ({
        reservationId,
        startsAt: checkIn.startsAt.toISOString(),
        seriesId: checkIn.seriesId,
        kind: checkIn.kind,
        recordedStatus: checkIn.recordedStatus,
        clientTimeZone: checkIn.clientTimeZone,
        coachTimeZone: checkIn.coachTimeZone,
      })),
    ).toEqual(
      WEEK_STARTS.map((startsAt, week) => ({
        reservationId: `reservation-${week + 1}`,
        startsAt,
        seriesId: "id-1",
        kind: "recurring",
        recordedStatus: "approved",
        clientTimeZone: "Europe/London",
        coachTimeZone: "Europe/Bucharest",
      })),
    );
    expect(result).toEqual({
      status: "set_up",
      series: series.toSnapshot(),
      occurrences: weeks.map(({ checkIn }) => checkIn.toSnapshot()),
    });
  });

  it("answers with the weeks as recorded, a week whose hour is taken as a clash holding no time", async () => {
    // arrange
    const { ports, setUpCheckInSeriesUseCase } = createSetUp({
      hold: { status: "taken" },
    });

    // act
    const result = await setUpCheckInSeriesUseCase.execute(WEDNESDAY_EVENINGS);

    // assert
    const [weeks] = ports.checkInSeriesRecordsPort.recordWeeks.mock.calls[0];
    expect(weeks[0]).toMatchObject({ reservationId: null });
    expect(weeks[0]?.checkIn.recordedStatus).toBe("clash");
    expect(result).toMatchObject({
      status: "set_up",
      occurrences: expect.arrayContaining([
        expect.objectContaining({ recordedStatus: "clash" }),
      ]),
    });
  });

  it("emails the client the series and its first week", async () => {
    // arrange
    const { ports, setUpCheckInSeriesUseCase } = createSetUp();

    // act
    await setUpCheckInSeriesUseCase.execute(WEDNESDAY_EVENINGS);

    // assert
    expect(ports.checkInNotificationsPort.seriesSetUp).toHaveBeenCalledWith({
      series: expect.objectContaining({ id: "id-1", weekday: "wednesday" }),
      weekStartsAt: new Date(WEEK_STARTS[0]),
      clientTimeZone: "Europe/London",
      client: ANA,
      recipient: "client",
    });
  });

  it("keeps the series and reports the email that failed", async () => {
    // arrange
    const { ports, setUpCheckInSeriesUseCase } = createSetUp();
    ports.checkInNotificationsPort.seriesSetUp.mockResolvedValue("failed");

    // act
    const result = await setUpCheckInSeriesUseCase.execute(WEDNESDAY_EVENINGS);

    // assert
    expect(result.status).toBe("set_up");
    expect(
      ports.checkInIncidentsPort.checkInSeriesNotificationFailed,
    ).toHaveBeenCalledWith({ seriesId: "id-1", notification: "seriesSetUp" });
  });

  it("writes the series to her inbox, opening her earliest recorded week", async () => {
    // arrange
    const { ports, setUpCheckInSeriesUseCase } = createSetUp();

    // act
    await setUpCheckInSeriesUseCase.execute(WEDNESDAY_EVENINGS);

    // assert
    expect(ports.checkInInboxPort.seriesEvent).toHaveBeenCalledWith(
      "seriesSetUp",
      {
        series: expect.objectContaining({ id: "id-1" }),
        weekStartsAt: new Date(WEEK_STARTS[0]),
        clientTimeZone: "Europe/London",
        client: ANA,
        recipient: "client",
        firstWeekId: "id-2",
      },
    );
  });

  it("starts a waiting client's weeks at her program start", async () => {
    // arrange
    const { ports, setUpCheckInSeriesUseCase } = createSetUp({
      client: {
        ...ANA_REACH,
        programStartsAt: new Date("2026-10-19T09:00:00.000Z"),
      },
    });

    // act
    await setUpCheckInSeriesUseCase.execute(WEDNESDAY_EVENINGS);

    // assert
    const [weeks] = ports.checkInSeriesRecordsPort.recordWeeks.mock.calls[0];
    expect(weeks.map(({ checkIn }) => checkIn.startsAt.toISOString())).toEqual(
      WEEK_STARTS.slice(2),
    );
  });

  it("refuses a second active series without emailing", async () => {
    // arrange
    const { ports, setUpCheckInSeriesUseCase } = createSetUp({
      started: "series_exists",
    });

    // act
    const result = await setUpCheckInSeriesUseCase.execute(WEDNESDAY_EVENINGS);

    // assert
    expect(result).toEqual({ status: "series_exists" });
    expect(ports.coachTimePort.reserve).not.toHaveBeenCalled();
    expect(ports.checkInSeriesRecordsPort.recordWeeks).not.toHaveBeenCalled();
    expect(ports.checkInNotificationsPort.seriesSetUp).not.toHaveBeenCalled();
  });

  it.each([
    { situation: "an unknown client", client: null, status: "unknown_client" },
    {
      situation: "a client still onboarding",
      client: { ...ANA_REACH, portal: "awaiting_onboarding" },
      status: "client_cannot_answer",
    },
    {
      situation: "a client whose coaching ended",
      client: { ...ANA_REACH, portal: "ended" },
      status: "client_cannot_answer",
    },
    {
      situation: "a client without a paid period",
      client: { ...ANA_REACH, programStartsAt: null, paidThrough: null },
      status: "client_cannot_answer",
    },
    {
      situation: "a client whose coaching is cancelled and ends later",
      client: { ...ANA_REACH, coachingEndsAt: A_DAY_LATER },
      status: "client_cannot_answer",
    },
    {
      situation: "a client whose paid period ends within a day",
      client: { ...ANA_REACH, paidThrough: A_DAY_LATER },
      status: "nothing_to_create",
    },
  ] as const)(
    "refuses $situation with $status without writing",
    async ({ client, status }) => {
      // arrange
      const { ports, setUpCheckInSeriesUseCase } = createSetUp({ client });

      // act
      const result =
        await setUpCheckInSeriesUseCase.execute(WEDNESDAY_EVENINGS);

      // assert
      expect(result).toEqual({ status });
      expect(ports.checkInSeriesRecordsPort.start).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      situation: "a day outside her availability",
      weekday: "tuesday",
      hour: 18,
    },
    {
      situation: "an hour outside her availability",
      weekday: "wednesday",
      hour: 20,
    },
  ] as const)(
    "refuses $situation without writing",
    async ({ weekday, hour }) => {
      // arrange
      const { ports, setUpCheckInSeriesUseCase } = createSetUp();

      // act
      const result = await setUpCheckInSeriesUseCase.execute({
        clientId: "client-1",
        weekday,
        hour,
      });

      // assert
      expect(result).toEqual({ status: "outside_availability" });
      expect(ports.checkInSeriesRecordsPort.start).not.toHaveBeenCalled();
    },
  );
});
