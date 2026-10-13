import { describe, expect, it, vi } from "vitest";

import type {
  ClientIdentities,
  ClientReach,
  ClientReachReading,
} from "../client";
import { CoachAvailability } from "../coach-availability";

import { CheckIn } from "./check-in";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSeries } from "./check-in-series";
import type {
  CheckInSeriesRecords,
  CheckInSeriesSetUpResult,
} from "./check-in-series-records";
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

function createSetUp(options?: {
  client?: ClientReachReading | null;
  recorded?: CheckInSeriesSetUpResult;
}) {
  let generated = 0;
  const series = {
    setUp: vi.fn(
      async (
        command: Parameters<CheckInSeriesRecords["setUp"]>[0],
      ): Promise<CheckInSeriesSetUpResult> =>
        options?.recorded ?? {
          status: "set_up",
          occurrences: command.occurrences.map(({ checkIn }) => checkIn),
        },
    ),
  } satisfies Pick<CheckInSeriesRecords, "setUp">;
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
  };
  const ports = {
    availability: availabilityOf(),
    clients,
    clock: { now: () => NOW },
    identities,
    ids: { generate: () => `id-${(generated += 1)}` },
    incidents,
    notifications,
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
    const [{ series, occurrences, at }] = ports.series.setUp.mock.calls[0];
    expect(at).toEqual(NOW);
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
      occurrences.map(({ checkIn, availability }) => ({
        availability,
        startsAt: checkIn.startsAt.toISOString(),
        seriesId: checkIn.seriesId,
        kind: checkIn.kind,
        recordedStatus: checkIn.recordedStatus,
        clientTimeZone: checkIn.clientTimeZone,
        coachTimeZone: checkIn.coachTimeZone,
      })),
    ).toEqual(
      WEEK_STARTS.map((startsAt) => ({
        availability: "open",
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
      occurrences: occurrences.map(({ checkIn }) => checkIn.toSnapshot()),
    });
  });

  it("answers with the weeks as recorded, clashes included", async () => {
    // arrange
    const clash = CheckIn.seriesOccurrence({
      id: "week-1",
      seriesId: "id-1",
      clientId: "client-1",
      startsAt: new Date(WEEK_STARTS[0]),
      clientTimeZone: "Europe/London",
      coachTimeZone: "Europe/Bucharest",
      at: NOW,
    }).asClash();
    const { setUp } = createSetUp({
      recorded: { status: "set_up", occurrences: [clash] },
    });

    // act
    const result = await setUp.execute(WEDNESDAY_EVENINGS);

    // assert
    expect(result).toMatchObject({
      status: "set_up",
      occurrences: [clash.toSnapshot()],
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
      firstOccurrenceAt: new Date(WEEK_STARTS[0]),
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
    const [{ occurrences }] = ports.series.setUp.mock.calls[0];
    expect(
      occurrences.map(({ checkIn }) => checkIn.startsAt.toISOString()),
    ).toEqual(WEEK_STARTS.slice(2));
  });

  it("refuses a second active series without emailing", async () => {
    // arrange
    const { ports, setUp } = createSetUp({
      recorded: { status: "series_exists" },
    });

    // act
    const result = await setUp.execute(WEDNESDAY_EVENINGS);

    // assert
    expect(result).toEqual({ status: "series_exists" });
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
      situation: "a client whose coaching ends within a day",
      client: { ...ANA_REACH, coachingEndsAt: A_DAY_LATER },
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
      expect(ports.series.setUp).not.toHaveBeenCalled();
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
      expect(ports.series.setUp).not.toHaveBeenCalled();
    },
  );
});
