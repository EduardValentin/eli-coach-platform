import { describe, expect, it, vi } from "vitest";

import type { ClientReach, ClientReachReading } from "../client";
import { CoachAvailability, type Weekday } from "../coach-availability";

import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import type {
  CheckInSeriesExtension,
  CheckInSeriesRecords,
} from "./check-in-series-records";
import { ExtendCheckInSeriesUseCase } from "./extend-check-in-series-use-case";

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

const RENEWED_WEEKS = [
  "2026-11-11T16:00:00.000Z",
  "2026-11-18T16:00:00.000Z",
  "2026-11-25T16:00:00.000Z",
  "2026-12-02T16:00:00.000Z",
];

function availabilityOn(weekdays: Weekday[]) {
  const result = CoachAvailability.from({
    timeZone: "Europe/Bucharest",
    weekdays,
    startHour: 9,
    endHour: 20,
  });

  if (result.status !== "configured") {
    throw new Error(`expected a configured availability: ${result.problems}`);
  }

  return { current: vi.fn().mockResolvedValue(result.availability) };
}

function createExtend(options?: {
  active?: CheckInSeries | null;
  client?: ClientReachReading | null;
  now?: Date;
  weekdays?: Weekday[];
}) {
  let generated = 0;
  const series = {
    findActiveForClient: vi
      .fn()
      .mockResolvedValue(
        options?.active === undefined
          ? CheckInSeries.reconstitute(SERIES)
          : options.active,
      ),
    extend: vi.fn(
      async (
        command: Parameters<CheckInSeriesRecords["extend"]>[0],
      ): Promise<CheckInSeriesExtension> => ({
        status: "extended",
        occurrences: command.occurrences.map(({ checkIn }) => checkIn),
      }),
    ),
  } satisfies Pick<CheckInSeriesRecords, "findActiveForClient" | "extend">;
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
  };
  const now = options?.now ?? RENEWAL_DAY;
  const ports = {
    availability: availabilityOn(
      options?.weekdays ?? ["monday", "wednesday", "friday"],
    ),
    clients,
    clock: { now: () => now },
    ids: { generate: () => `week-${(generated += 1)}` },
    incidents,
    series,
  };

  return { extend: new ExtendCheckInSeriesUseCase(ports), ports };
}

function weeksOf(command: Parameters<CheckInSeriesRecords["extend"]>[0]) {
  return command.occurrences.map(({ checkIn, availability }) => ({
    startsAt: checkIn.startsAt.toISOString(),
    availability,
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
    const [command] = ports.series.extend.mock.calls[0];
    expect(command.series.toSnapshot()).toEqual({
      ...SERIES,
      coversUntil: RENEWED_THROUGH,
    });
    expect(command.expected).toEqual({
      coversFrom: COVERS_FROM,
      coversUntil: COVERS_UNTIL,
    });
    expect(command.at).toEqual(RENEWAL_DAY);
    expect(weeksOf(command)).toEqual(
      RENEWED_WEEKS.map((startsAt) => ({ startsAt, availability: "open" })),
    );
    expect(
      command.occurrences.every(
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
    const [command] = ports.series.extend.mock.calls[0];
    expect(weeksOf(command)).toEqual([
      { startsAt: "2026-10-07T15:00:00.000Z", availability: "open" },
      { startsAt: "2026-10-14T15:00:00.000Z", availability: "open" },
    ]);
    expect(command.series.coversFrom).toEqual(COVERS_FROM);
  });

  it("adds the weeks as clashes when the series hour is no longer inside the coach's availability", async () => {
    // arrange
    const { extend, ports } = createExtend({ weekdays: ["monday"] });

    // act
    await extend.execute({ clientId: "client-1" });

    // assert
    const [command] = ports.series.extend.mock.calls[0];
    expect(weeksOf(command)).toEqual(
      RENEWED_WEEKS.map((startsAt) => ({ startsAt, availability: "closed" })),
    );
  });

  it.each([
    { situation: "a client without an active series", active: null },
    {
      situation: "a client whose coaching ended",
      client: { ...RENEWED_REACH, portal: "ended" },
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
    expect(ports.series.extend).not.toHaveBeenCalled();
  });

  it("re-reads once when the series changed meanwhile", async () => {
    // arrange
    const { extend, ports } = createExtend();
    ports.series.extend.mockResolvedValueOnce({ status: "changed_meanwhile" });

    // act
    const result = await extend.execute({ clientId: "client-1" });

    // assert
    expect(result).toEqual({ status: "extended", created: 4 });
    expect(ports.series.findActiveForClient).toHaveBeenCalledTimes(2);
  });

  it("reports and answers failed when the series keeps changing", async () => {
    // arrange
    const { extend, ports } = createExtend();
    ports.series.extend.mockResolvedValue({ status: "changed_meanwhile" });

    // act
    const result = await extend.execute({ clientId: "client-1" });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(ports.series.extend).toHaveBeenCalledTimes(2);
    expect(ports.incidents.checkInSeriesExtensionFailed).toHaveBeenCalledWith({
      clientId: "client-1",
      error: expect.any(Error),
    });
  });

  it("reports a failed read or write and answers failed without throwing", async () => {
    // arrange
    const failure = new Error("connection refused");
    const { extend, ports } = createExtend();
    ports.series.extend.mockRejectedValue(failure);

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
