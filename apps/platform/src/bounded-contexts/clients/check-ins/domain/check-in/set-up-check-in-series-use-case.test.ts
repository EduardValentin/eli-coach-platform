import { describe, expect, it, vi } from "vitest";

import type { ClientIdentities } from "./client-identities";
import type { ClientReach, ClientReachReading } from "./client-reach";

import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSeries } from "./check-in-series";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import type { CoachTime, CoachTimeHold } from "./coach-time";
import { CoachWeek, type OpenSlots } from "./open-slots";
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
  } satisfies Pick<OpenSlots, "coachWeek">;
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
      .fn<CheckInSeriesRecords["recordWeeks"]>()
      .mockResolvedValue(undefined),
  } satisfies Pick<CheckInSeriesRecords, "start" | "recordWeeks">;
  const coachTime = {
    reserve: vi.fn(
      async (): Promise<CoachTimeHold> =>
        options?.hold ?? {
          status: "reserved",
          reservationId: `reservation-${(reserved += 1)}`,
        },
    ),
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
    seriesSetUp: vi.fn().mockResolvedValue("sent"),
    seriesChanged: vi.fn(),
    seriesStopped: vi.fn(),
  } satisfies CheckInNotifications;
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
    clients,
    clock: { now: () => NOW },
    coachTime,
    identities,
    ids: { generate: () => `id-${(generated += 1)}` },
    incidents,
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

  return { ports, setUp: new SetUpCheckInSeriesUseCase(ports) };
}

describe("SetUpCheckInSeriesUseCase", () => {
  it("records the series with one approved week per week of her paid period, in one write", async () => {
    // arrange
    const { ports, setUp } = createSetUp();

    // act
    const result = await setUp.execute(WEDNESDAY_EVENINGS);

    // assert
    const [series] = ports.series.start.mock.calls[0];
    const [weeks] = ports.series.recordWeeks.mock.calls[0];
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
    const { ports, setUp } = createSetUp({ hold: { status: "taken" } });

    // act
    const result = await setUp.execute(WEDNESDAY_EVENINGS);

    // assert
    const [weeks] = ports.series.recordWeeks.mock.calls[0];
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
    const { ports, setUp } = createSetUp();

    // act
    await setUp.execute(WEDNESDAY_EVENINGS);

    // assert
    expect(ports.notifications.seriesSetUp).toHaveBeenCalledWith({
      series: expect.objectContaining({ id: "id-1", weekday: "wednesday" }),
      weekStartsAt: new Date(WEEK_STARTS[0]),
      clientTimeZone: "Europe/London",
      client: ANA,
      recipient: "client",
    });
  });

  it("keeps the series and reports the email that failed", async () => {
    // arrange
    const { ports, setUp } = createSetUp();
    ports.notifications.seriesSetUp.mockResolvedValue("failed");

    // act
    const result = await setUp.execute(WEDNESDAY_EVENINGS);

    // assert
    expect(result.status).toBe("set_up");
    expect(
      ports.incidents.checkInSeriesNotificationFailed,
    ).toHaveBeenCalledWith({ seriesId: "id-1", notification: "seriesSetUp" });
  });

  it("writes the series to her inbox, opening her earliest recorded week", async () => {
    // arrange
    const { ports, setUp } = createSetUp();

    // act
    await setUp.execute(WEDNESDAY_EVENINGS);

    // assert
    expect(ports.inbox.seriesEvent).toHaveBeenCalledWith("seriesSetUp", {
      series: expect.objectContaining({ id: "id-1" }),
      weekStartsAt: new Date(WEEK_STARTS[0]),
      clientTimeZone: "Europe/London",
      client: ANA,
      recipient: "client",
      firstWeekId: "id-2",
    });
  });

  it("starts a waiting client's weeks at her program start", async () => {
    // arrange
    const { ports, setUp } = createSetUp({
      client: {
        ...ANA_REACH,
        programStartsAt: new Date("2026-10-19T09:00:00.000Z"),
      },
    });

    // act
    await setUp.execute(WEDNESDAY_EVENINGS);

    // assert
    const [weeks] = ports.series.recordWeeks.mock.calls[0];
    expect(weeks.map(({ checkIn }) => checkIn.startsAt.toISOString())).toEqual(
      WEEK_STARTS.slice(2),
    );
  });

  it("refuses a second active series without emailing", async () => {
    // arrange
    const { ports, setUp } = createSetUp({ started: "series_exists" });

    // act
    const result = await setUp.execute(WEDNESDAY_EVENINGS);

    // assert
    expect(result).toEqual({ status: "series_exists" });
    expect(ports.coachTime.reserve).not.toHaveBeenCalled();
    expect(ports.series.recordWeeks).not.toHaveBeenCalled();
    expect(ports.notifications.seriesSetUp).not.toHaveBeenCalled();
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
      const { ports, setUp } = createSetUp({ client });

      // act
      const result = await setUp.execute(WEDNESDAY_EVENINGS);

      // assert
      expect(result).toEqual({ status });
      expect(ports.series.start).not.toHaveBeenCalled();
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
      const { ports, setUp } = createSetUp();

      // act
      const result = await setUp.execute({
        clientId: "client-1",
        weekday,
        hour,
      });

      // assert
      expect(result).toEqual({ status: "outside_availability" });
      expect(ports.series.start).not.toHaveBeenCalled();
    },
  );
});
