import { describe, expect, it, vi } from "vitest";

import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort, ClientReachReading } from "./client-reach-port";

import { CheckIn } from "./check-in";
import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import type { CheckInsPort } from "./check-ins-port";
import type { CoachTimePort, CoachTimeHold } from "./coach-time-port";
import { CoachWeek } from "./open-slots";
import { type OpenSlotsPort } from "./open-slots-port";
import { ScheduleCheckInUseCase } from "./schedule-check-in-use-case";

const NOW = new Date("2026-06-01T08:30:00.000Z");
const OPEN_START = new Date("2026-06-03T09:00:00.000Z");
const INSIDE_A_DAY = new Date("2026-06-02T08:00:00.000Z");

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
  programStartsAt: null,
  paidThrough: null,
  timeZone: "America/New_York",
};

const COMMAND = {
  clientId: "client-1",
  startsAt: OPEN_START,
  note: "  Let's review your first month.  ",
};

function workingDays() {
  return {
    coachWeek: vi.fn().mockResolvedValue(
      CoachWeek.of({
        timeZone: "Europe/Bucharest",
        weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        hours: [9, 10, 11, 12, 13, 14, 15, 16],
      }),
    ),
    offersStart: vi.fn(
      async ({ start }: { start: Date }) =>
        start.getTime() === OPEN_START.getTime(),
    ),
  } satisfies Pick<OpenSlotsPort, "coachWeek" | "offersStart">;
}

function createCoachTime(hold?: CoachTimeHold) {
  return {
    reserve: vi
      .fn()
      .mockResolvedValue(
        hold ?? { status: "reserved", reservationId: "reservation-1" },
      ),
    release: vi.fn().mockResolvedValue(undefined),
  } satisfies CoachTimePort;
}

function createScheduleCheckIn(options?: {
  client?: ClientReachReading | null;
  hold?: CoachTimeHold;
}) {
  const checkIns = {
    listForClientLocked: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(undefined),
    find: vi.fn().mockResolvedValue(null),
    listForClient: vi.fn().mockResolvedValue([]),
    listAll: vi.fn().mockResolvedValue([]),
    settle: vi
      .fn()
      .mockResolvedValue({ status: "settled", freedReservationId: null }),
    move: vi
      .fn()
      .mockResolvedValue({ status: "moved", freedReservationId: null }),
    endCoaching: vi.fn().mockResolvedValue({
      cancelled: [],
      seriesStopped: false,
      freedReservationIds: [],
    }),
  } satisfies CheckInsPort;
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
    requested: vi.fn().mockResolvedValue("sent"),
    withdrawn: vi.fn().mockResolvedValue("sent"),
    approved: vi.fn().mockResolvedValue("sent"),
    declined: vi.fn().mockResolvedValue("sent"),
    newTimeProposed: vi.fn().mockResolvedValue("sent"),
    newTimeAccepted: vi.fn().mockResolvedValue("sent"),
    newTimeDeclined: vi.fn().mockResolvedValue("sent"),
    cancelled: vi.fn().mockResolvedValue("sent"),
    seriesSetUp: vi.fn().mockResolvedValue("sent"),
    seriesChanged: vi.fn().mockResolvedValue("sent"),
    seriesStopped: vi.fn().mockResolvedValue("sent"),
  } satisfies CheckInNotificationsPort;
  const ports = {
    checkIns,
    clients,
    clock: { now: () => NOW },
    coachTime: createCoachTime(options?.hold),
    identities,
    ids: { generate: () => "check-in-1" },
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
    openSlots: workingDays(),
  };

  return { ports, scheduleCheckIn: new ScheduleCheckInUseCase(ports) };
}

describe("ScheduleCheckInUseCase", () => {
  it("records a pending request the coach initiated and proposed, in the zone the client booked from", async () => {
    // arrange
    const { scheduleCheckIn, ports } = createScheduleCheckIn();

    // act
    const result = await scheduleCheckIn.execute(COMMAND);

    // assert
    expect(result).toEqual({
      status: "scheduled",
      checkIn: expect.objectContaining({
        id: "check-in-1",
        clientId: "client-1",
        startsAt: OPEN_START,
        clientTimeZone: "America/New_York",
        coachTimeZone: "Europe/Bucharest",
        recordedStatus: "pending",
        initiatedBy: "coach",
        proposedBy: "coach",
        note: "Let's review your first month.",
        requestedAt: NOW,
      }),
    });
    expect(ports.clients.findById).toHaveBeenCalledWith("client-1");
    expect(ports.checkIns.add).toHaveBeenCalledWith({
      checkIn: expect.any(CheckIn),
      reservationId: "reservation-1",
    });
  });

  it("emails the client the coach's request", async () => {
    // arrange
    const { scheduleCheckIn, ports } = createScheduleCheckIn();

    // act
    await scheduleCheckIn.execute(COMMAND);

    // assert
    expect(ports.notifications.requested).toHaveBeenCalledWith({
      checkIn: expect.objectContaining({ id: "check-in-1" }),
      client: ANA,
      recipient: "client",
    });
  });

  it("records no note when the coach wrote none", async () => {
    // arrange
    const { scheduleCheckIn } = createScheduleCheckIn();

    // act
    const result = await scheduleCheckIn.execute({ ...COMMAND, note: null });

    // assert
    expect(result).toEqual({
      status: "scheduled",
      checkIn: expect.objectContaining({ note: null }),
    });
  });

  it("answers unknown_client for a client with no record", async () => {
    // arrange
    const { scheduleCheckIn, ports } = createScheduleCheckIn({ client: null });

    // act
    const result = await scheduleCheckIn.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "unknown_client" });
    expect(ports.coachTime.reserve).not.toHaveBeenCalled();
  });

  it.each([["awaiting_onboarding"], ["ended"]] as const)(
    "refuses a client whose portal reach is %s",
    async (portal) => {
      // arrange
      const { scheduleCheckIn, ports } = createScheduleCheckIn({
        client: { ...ANA_REACH, portal },
      });

      // act
      const result = await scheduleCheckIn.execute(COMMAND);

      // assert
      expect(result).toEqual({ status: "client_cannot_answer" });
      expect(ports.coachTime.reserve).not.toHaveBeenCalled();
      expect(ports.notifications.requested).not.toHaveBeenCalled();
    },
  );

  it("refuses a time inside the next 24 hours without holding it", async () => {
    // arrange
    const { scheduleCheckIn, ports } = createScheduleCheckIn();

    // act
    const result = await scheduleCheckIn.execute({
      ...COMMAND,
      startsAt: INSIDE_A_DAY,
    });

    // assert
    expect(result).toEqual({ status: "time_taken" });
    expect(ports.coachTime.reserve).not.toHaveBeenCalled();
  });

  it("refuses an hour taken meanwhile and emails nobody", async () => {
    // arrange
    const { scheduleCheckIn, ports } = createScheduleCheckIn({
      hold: { status: "taken" },
    });

    // act
    const result = await scheduleCheckIn.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "time_taken" });
    expect(ports.checkIns.add).not.toHaveBeenCalled();
    expect(ports.notifications.requested).not.toHaveBeenCalled();
  });

  it("refuses a time at or after the client's coaching end without holding it", async () => {
    // arrange
    const { scheduleCheckIn, ports } = createScheduleCheckIn({
      client: { ...ANA_REACH, coachingEndsAt: OPEN_START },
    });

    // act
    const result = await scheduleCheckIn.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "time_taken" });
    expect(ports.coachTime.reserve).not.toHaveBeenCalled();
  });

  it("refuses a note longer than 500 characters", async () => {
    // arrange
    const { scheduleCheckIn, ports } = createScheduleCheckIn();

    // act
    const result = await scheduleCheckIn.execute({
      ...COMMAND,
      note: "a".repeat(501),
    });

    // assert
    expect(result).toEqual({ status: "note_too_long" });
    expect(ports.coachTime.reserve).not.toHaveBeenCalled();
  });

  it("refuses a booking zone that names no place", async () => {
    // arrange
    const { scheduleCheckIn, ports } = createScheduleCheckIn({
      client: { ...ANA_REACH, timeZone: "Mars/Olympus_Mons" },
    });

    // act
    const result = await scheduleCheckIn.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "invalid_time_zone" });
    expect(ports.coachTime.reserve).not.toHaveBeenCalled();
  });

  it("keeps the request and reports the email the provider refused", async () => {
    // arrange
    const { scheduleCheckIn, ports } = createScheduleCheckIn();
    ports.notifications.requested.mockResolvedValue("failed");

    // act
    const result = await scheduleCheckIn.execute(COMMAND);

    // assert
    expect(result.status).toBe("scheduled");
    expect(ports.incidents.checkInNotificationFailed).toHaveBeenCalledWith({
      checkInId: "check-in-1",
      notification: "requested",
    });
  });
});
