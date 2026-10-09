import { describe, expect, it, vi } from "vitest";

import {
  CoachAvailability,
  type CoachAvailabilitySource,
} from "../coach-availability";

import { CheckIn } from "./check-in";
import type { CheckInClient, CheckInClients } from "./check-in-clients";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import type { CheckInRequestResult, CheckIns } from "./check-ins";
import { RequestCheckInUseCase } from "./request-check-in-use-case";

const NOW = new Date("2026-06-01T08:30:00.000Z");
const OPEN_START = new Date("2026-06-03T09:00:00.000Z");
const INSIDE_A_DAY = new Date("2026-06-02T08:00:00.000Z");
const OUTSIDE_THE_WINDOW = new Date("2026-06-03T15:00:00.000Z");

const ANA = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
};

const COMMAND = {
  authSubjectId: "user_ana",
  startsAt: OPEN_START,
  clientTimeZone: "Europe/London",
  note: "  Can we look at my squat?  ",
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

function createCheckIns(answer?: CheckInRequestResult) {
  return {
    request: vi.fn(
      async ({ checkIn }: { checkIn: CheckIn }) =>
        answer ?? { status: "requested" as const, checkIn },
    ),
    find: vi.fn().mockResolvedValue(null),
    listForClient: vi.fn().mockResolvedValue([]),
    listAll: vi.fn().mockResolvedValue([]),
    settle: vi.fn().mockResolvedValue("settled"),
  } satisfies CheckIns;
}

function createClients(client: CheckInClient | null) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(client),
    identitiesOf: vi.fn().mockResolvedValue([ANA]),
  } satisfies CheckInClients;
}

function createNotifications() {
  return {
    requested: vi.fn().mockResolvedValue("sent"),
    withdrawn: vi.fn().mockResolvedValue("sent"),
    approved: vi.fn().mockResolvedValue("sent"),
    declined: vi.fn().mockResolvedValue("sent"),
  } satisfies CheckInNotifications;
}

function createRequestCheckIn(options?: {
  checkIns?: ReturnType<typeof createCheckIns>;
  client?: CheckInClient | null;
  notifications?: ReturnType<typeof createNotifications>;
  incidents?: CheckInIncidents;
}) {
  const ports = {
    availability: workingDays(),
    checkIns: options?.checkIns ?? createCheckIns(),
    clients: createClients(
      options?.client === undefined
        ? { clientId: "client-1", portal: "reachable" }
        : options.client,
    ),
    clock: { now: () => NOW },
    ids: { generate: () => "check-in-1" },
    incidents: options?.incidents ?? { checkInNotificationFailed: vi.fn() },
    notifications: options?.notifications ?? createNotifications(),
  };

  return { ports, requestCheckIn: new RequestCheckInUseCase(ports) };
}

describe("RequestCheckInUseCase", () => {
  it("records a pending request for an open time with her note and both zones", async () => {
    // arrange
    const { requestCheckIn, ports } = createRequestCheckIn();

    // act
    const result = await requestCheckIn.execute(COMMAND);

    // assert
    expect(result).toEqual({
      status: "requested",
      checkIn: expect.objectContaining({
        id: "check-in-1",
        clientId: "client-1",
        startsAt: OPEN_START,
        clientTimeZone: "Europe/London",
        coachTimeZone: "Europe/Bucharest",
        recordedStatus: "pending",
        initiatedBy: "client",
        note: "Can we look at my squat?",
        requestedAt: NOW,
      }),
    });
    expect(ports.checkIns.request).toHaveBeenCalledWith({
      checkIn: expect.any(CheckIn),
      at: NOW,
    });
  });

  it("emails the coach the request with the client's name", async () => {
    // arrange
    const notifications = createNotifications();
    const { requestCheckIn } = createRequestCheckIn({ notifications });

    // act
    await requestCheckIn.execute(COMMAND);

    // assert
    expect(notifications.requested).toHaveBeenCalledWith({
      checkIn: expect.objectContaining({ id: "check-in-1" }),
      client: ANA,
    });
  });

  it("records no note when she left it blank", async () => {
    // arrange
    const { requestCheckIn } = createRequestCheckIn();

    // act
    const result = await requestCheckIn.execute({ ...COMMAND, note: "   " });

    // assert
    expect(result).toEqual({
      status: "requested",
      checkIn: expect.objectContaining({ note: null }),
    });
  });

  it.each([
    ["inside the next 24 hours", INSIDE_A_DAY],
    ["outside the coach's hours", OUTSIDE_THE_WINDOW],
  ])("refuses a time %s without holding it", async (_situation, startsAt) => {
    // arrange
    const { requestCheckIn, ports } = createRequestCheckIn();

    // act
    const result = await requestCheckIn.execute({ ...COMMAND, startsAt });

    // assert
    expect(result).toEqual({ status: "time_taken" });
    expect(ports.checkIns.request).not.toHaveBeenCalled();
  });

  it.each([
    ["while her earlier request waits", "request_waiting"],
    ["when the hour was taken meanwhile", "time_taken"],
  ] as const)(
    "refuses the request %s and emails nobody",
    async (_situation, refusal) => {
      // arrange
      const notifications = createNotifications();
      const { requestCheckIn } = createRequestCheckIn({
        checkIns: createCheckIns({ status: refusal }),
        notifications,
      });

      // act
      const result = await requestCheckIn.execute(COMMAND);

      // assert
      expect(result).toEqual({ status: refusal });
      expect(notifications.requested).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["whose coaching ended", { clientId: "client-1", portal: "unreachable" }],
    ["with no client record", null],
  ] as const)("refuses a requester %s", async (_situation, client) => {
    // arrange
    const { requestCheckIn, ports } = createRequestCheckIn({ client });

    // act
    const result = await requestCheckIn.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(ports.checkIns.request).not.toHaveBeenCalled();
  });

  it("refuses a note longer than 500 characters", async () => {
    // arrange
    const { requestCheckIn, ports } = createRequestCheckIn();

    // act
    const result = await requestCheckIn.execute({
      ...COMMAND,
      note: "a".repeat(501),
    });

    // assert
    expect(result).toEqual({ status: "note_too_long" });
    expect(ports.checkIns.request).not.toHaveBeenCalled();
  });

  it.each([["Mars/Olympus_Mons"], ["+02:00"], [""]])(
    "refuses the unknown time zone %j",
    async (clientTimeZone) => {
      // arrange
      const { requestCheckIn, ports } = createRequestCheckIn();

      // act
      const result = await requestCheckIn.execute({
        ...COMMAND,
        clientTimeZone,
      });

      // assert
      expect(result).toEqual({ status: "invalid_time_zone" });
      expect(ports.checkIns.request).not.toHaveBeenCalled();
    },
  );

  it("keeps the request and reports the email the provider refused", async () => {
    // arrange
    const notifications = createNotifications();
    notifications.requested.mockResolvedValue("failed");
    const incidents = { checkInNotificationFailed: vi.fn() };
    const { requestCheckIn } = createRequestCheckIn({
      notifications,
      incidents,
    });

    // act
    const result = await requestCheckIn.execute(COMMAND);

    // assert
    expect(result.status).toBe("requested");
    expect(incidents.checkInNotificationFailed).toHaveBeenCalledWith({
      checkInId: "check-in-1",
      notification: "requested",
    });
  });

  it("keeps the request and reports an email that could not be sent at all", async () => {
    // arrange
    const notifications = createNotifications();
    notifications.requested.mockRejectedValue(new Error("provider down"));
    const incidents = { checkInNotificationFailed: vi.fn() };
    const { requestCheckIn } = createRequestCheckIn({
      notifications,
      incidents,
    });

    // act
    const result = await requestCheckIn.execute(COMMAND);

    // assert
    expect(result.status).toBe("requested");
    expect(incidents.checkInNotificationFailed).toHaveBeenCalledWith({
      checkInId: "check-in-1",
      notification: "requested",
    });
  });
});
