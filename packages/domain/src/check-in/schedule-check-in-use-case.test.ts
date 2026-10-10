import { describe, expect, it, vi } from "vitest";

import {
  CoachAvailability,
  type CoachAvailabilitySource,
} from "../coach-availability";

import { CheckIn } from "./check-in";
import type {
  CheckInClientReference,
  CheckInClients,
} from "./check-in-clients";
import type { CheckInNotifications } from "./check-in-notifications";
import type { CheckInRequestResult, CheckIns } from "./check-ins";
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

const ANA_REFERENCE: CheckInClientReference = {
  clientId: "client-1",
  portal: "reachable",
  bookingTimeZone: "America/New_York",
};

const COMMAND = {
  clientId: "client-1",
  startsAt: OPEN_START,
  note: "  Let's review your first month.  ",
};

function workingDays(): CoachAvailabilitySource {
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

function createScheduleCheckIn(options?: {
  client?: CheckInClientReference | null;
  answer?: CheckInRequestResult;
}) {
  const checkIns = {
    request: vi.fn(
      async ({ checkIn }: { checkIn: CheckIn }) =>
        options?.answer ?? { status: "requested" as const, checkIn },
    ),
    find: vi.fn().mockResolvedValue(null),
    listForClient: vi.fn().mockResolvedValue([]),
    listAll: vi.fn().mockResolvedValue([]),
    settle: vi.fn().mockResolvedValue("settled"),
  } satisfies CheckIns;
  const clients = {
    findById: vi
      .fn()
      .mockResolvedValue(
        options?.client === undefined ? ANA_REFERENCE : options.client,
      ),
    identitiesOf: vi.fn().mockResolvedValue([ANA]),
  } satisfies Pick<CheckInClients, "findById" | "identitiesOf">;
  const notifications = {
    requested: vi.fn().mockResolvedValue("sent"),
    withdrawn: vi.fn().mockResolvedValue("sent"),
    approved: vi.fn().mockResolvedValue("sent"),
    declined: vi.fn().mockResolvedValue("sent"),
  } satisfies CheckInNotifications;
  const ports = {
    availability: workingDays(),
    checkIns,
    clients,
    clock: { now: () => NOW },
    ids: { generate: () => "check-in-1" },
    incidents: { checkInNotificationFailed: vi.fn() },
    notifications,
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
    expect(ports.checkIns.request).toHaveBeenCalledWith({
      checkIn: expect.any(CheckIn),
      at: NOW,
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
    expect(ports.checkIns.request).not.toHaveBeenCalled();
  });

  it.each([["awaiting_onboarding"], ["ended"]] as const)(
    "refuses a client whose portal reach is %s",
    async (portal) => {
      // arrange
      const { scheduleCheckIn, ports } = createScheduleCheckIn({
        client: { ...ANA_REFERENCE, portal },
      });

      // act
      const result = await scheduleCheckIn.execute(COMMAND);

      // assert
      expect(result).toEqual({ status: "client_cannot_answer" });
      expect(ports.checkIns.request).not.toHaveBeenCalled();
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
    expect(ports.checkIns.request).not.toHaveBeenCalled();
  });

  it("refuses an hour taken meanwhile and emails nobody", async () => {
    // arrange
    const { scheduleCheckIn, ports } = createScheduleCheckIn({
      answer: { status: "time_taken" },
    });

    // act
    const result = await scheduleCheckIn.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "time_taken" });
    expect(ports.notifications.requested).not.toHaveBeenCalled();
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
    expect(ports.checkIns.request).not.toHaveBeenCalled();
  });

  it("refuses a booking zone that names no place", async () => {
    // arrange
    const { scheduleCheckIn, ports } = createScheduleCheckIn({
      client: { ...ANA_REFERENCE, bookingTimeZone: "Mars/Olympus_Mons" },
    });

    // act
    const result = await scheduleCheckIn.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "invalid_time_zone" });
    expect(ports.checkIns.request).not.toHaveBeenCalled();
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
