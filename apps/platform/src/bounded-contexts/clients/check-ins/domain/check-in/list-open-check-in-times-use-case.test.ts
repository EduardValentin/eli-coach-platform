import { describe, expect, it, vi } from "vitest";

import type { ClientReachPort, ClientReachReading } from "./client-reach-port";
import { SchedulingOpenSlotsAdapter } from "~/bounded-contexts/clients/check-ins/adapters/outbound/scheduling/scheduling-open-slots-adapter.server";
import { OpenSlotsFacadeAdapter } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/facades/open-slots-facade-adapter.server";
import {
  CoachAvailability,
  CoachOpenings,
} from "~/bounded-contexts/scheduling/coach-schedule/public/coach-time";

import type { CheckInActor } from "./check-in-actor";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CoachTimeSpan } from "./coach-time-port";
import { ListOpenCheckInTimesUseCase } from "./list-open-check-in-times-use-case";

const MONDAY_LATE_MORNING = new Date("2026-06-01T08:30:00.000Z");

type OpeningsSources = ConstructorParameters<typeof CoachOpenings>[0];

function workingDays(): OpeningsSources["availability"] {
  const result = CoachAvailability.from({
    timeZone: "Europe/Bucharest",
    weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    startHour: 9,
    endHour: 17,
  });

  if (result.status !== "configured") {
    throw new Error(`expected a configured availability: ${result.problems}`);
  }

  return { current: vi.fn().mockResolvedValue(result.availability) };
}

function calendarBusyWith(busy: CoachTimeSpan[]) {
  return {
    busyFrom: vi.fn().mockResolvedValue(busy),
  } satisfies OpeningsSources["calendar"];
}

function openSlotsOver(sources: OpeningsSources): SchedulingOpenSlotsAdapter {
  return new SchedulingOpenSlotsAdapter({
    openSlots: new OpenSlotsFacadeAdapter(new CoachOpenings(sources)),
    rules: CHECK_IN_RULES,
  });
}

const ANA_ACTOR: CheckInActor = { party: "client", authSubjectId: "user_ana" };
const COACH: CheckInActor = { party: "coach" };

const ANA: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: null,
  paidThrough: null,
  timeZone: "Europe/London",
};

function createListOpenTimes(options?: {
  busy?: CoachTimeSpan[];
  client?: ClientReachReading | null;
}) {
  const client = options?.client === undefined ? ANA : options.client;
  const calendar = calendarBusyWith(options?.busy ?? []);
  const ports = {
    calendar,
    openSlots: openSlotsOver({ availability: workingDays(), calendar }),
    clients: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(client),
      findById: vi.fn().mockResolvedValue(client),
    } satisfies Pick<ClientReachPort, "findByAuthSubjectId" | "findById">,
    clock: { now: () => MONDAY_LATE_MORNING },
  };

  return {
    ports,
    listOpenTimes: new ListOpenCheckInTimesUseCase({
      clients: ports.clients,
      clock: ports.clock,
      openSlots: ports.openSlots,
    }),
  };
}

async function openTimes(options?: {
  busy?: CoachTimeSpan[];
  client?: ClientReachReading;
}): Promise<string[]> {
  const { listOpenTimes } = createListOpenTimes(options);

  const result = await listOpenTimes.execute({ actor: ANA_ACTOR });

  if (result.status !== "listed") {
    throw new Error(`expected open times, got ${result.status}`);
  }

  return result.times.map((time) => time.toISOString());
}

describe("ListOpenCheckInTimesUseCase", () => {
  it("offers nothing inside the next 24 hours", async () => {
    // arrange
    const elevenTuesdayBucharest = "2026-06-02T08:00:00.000Z";

    // act
    const times = await openTimes();

    // assert
    expect(times).not.toContain(elevenTuesdayBucharest);
    expect(times[0]).toBe("2026-06-02T09:00:00.000Z");
  });

  it("offers hourly starts up to the last hour that ends inside the window", async () => {
    // arrange
    const tuesday = "2026-06-02";

    // act
    const times = await openTimes();

    // assert
    expect(times.filter((time) => time.startsWith(tuesday))).toEqual([
      "2026-06-02T09:00:00.000Z",
      "2026-06-02T10:00:00.000Z",
      "2026-06-02T11:00:00.000Z",
      "2026-06-02T12:00:00.000Z",
      "2026-06-02T13:00:00.000Z",
    ]);
  });

  it("leaves out an hour the coach's schedule already holds", async () => {
    // arrange
    const bookedCall = {
      start: new Date("2026-06-02T10:00:00.000Z"),
      end: new Date("2026-06-02T11:00:00.000Z"),
    };

    // act
    const times = await openTimes({ busy: [bookedCall] });

    // assert
    expect(times).not.toContain("2026-06-02T10:00:00.000Z");
    expect(times).toContain("2026-06-02T11:00:00.000Z");
  });

  it("reads the coach's schedule from the instant it lists", async () => {
    // arrange
    const { listOpenTimes, ports } = createListOpenTimes();

    // act
    await listOpenTimes.execute({ actor: ANA_ACTOR });

    // assert
    expect(ports.calendar.busyFrom).toHaveBeenCalledWith(MONDAY_LATE_MORNING);
  });

  it("offers times up to 30 days ahead and none after", async () => {
    // arrange
    const lastDay = "2026-07-01";
    const dayAfter = "2026-07-02";

    // act
    const times = await openTimes();

    // assert
    expect(times.at(-1)).toBe(`${lastDay}T13:00:00.000Z`);
    expect(times.some((time) => time.startsWith(dayAfter))).toBe(false);
  });

  it("offers no start at or after her coaching end", async () => {
    // arrange
    const coachingEndsAt = new Date("2026-06-02T11:00:00.000Z");

    // act
    const times = await openTimes({ client: { ...ANA, coachingEndsAt } });

    // assert
    expect(times).toEqual([
      "2026-06-02T09:00:00.000Z",
      "2026-06-02T10:00:00.000Z",
    ]);
  });

  it("lists the client's own times by her sign-in, ignoring a client named in the request", async () => {
    // arrange
    const { listOpenTimes, ports } = createListOpenTimes();

    // act
    const result = await listOpenTimes.execute({
      actor: ANA_ACTOR,
      clientId: "client-2",
    });

    // assert
    expect(result.status).toBe("listed");
    expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    expect(ports.clients.findById).not.toHaveBeenCalled();
  });

  it("answers ended to a signed-in client with no client record", async () => {
    // arrange
    const { listOpenTimes, ports } = createListOpenTimes({ client: null });

    // act
    const result = await listOpenTimes.execute({ actor: ANA_ACTOR });

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(ports.calendar.busyFrom).not.toHaveBeenCalled();
  });

  it("stops the coach's times at the coaching end of the client she names", async () => {
    // arrange
    const { listOpenTimes, ports } = createListOpenTimes({
      client: {
        ...ANA,
        coachingEndsAt: new Date("2026-06-02T10:00:00.000Z"),
      },
    });

    // act
    const result = await listOpenTimes.execute({
      actor: COACH,
      clientId: "client-1",
    });

    // assert
    expect(result).toEqual({
      status: "listed",
      times: [new Date("2026-06-02T09:00:00.000Z")],
    });
    expect(ports.clients.findById).toHaveBeenCalledWith("client-1");
  });

  it("requires the coach to name the client", async () => {
    // arrange
    const { listOpenTimes, ports } = createListOpenTimes();

    // act
    const result = await listOpenTimes.execute({ actor: COACH });

    // assert
    expect(result).toEqual({ status: "client_required" });
    expect(ports.calendar.busyFrom).not.toHaveBeenCalled();
  });

  it("answers unknown_client when the coach names a client with no record", async () => {
    // arrange
    const { listOpenTimes } = createListOpenTimes({ client: null });

    // act
    const result = await listOpenTimes.execute({
      actor: COACH,
      clientId: "client-404",
    });

    // assert
    expect(result).toEqual({ status: "unknown_client" });
  });
});
