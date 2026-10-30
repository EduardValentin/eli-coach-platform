import { describe, expect, it, vi } from "vitest";

import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort, ClientReachReading } from "./client-reach-port";

import { CheckIn } from "./check-in";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import type { CheckInsPort } from "./check-ins-port";
import type { CoachTimePort, CoachTimeHold } from "./coach-time-port";
import { CoachWeek } from "./open-slots";
import { type OpenSlotsPort } from "./open-slots-port";
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

const REACHABLE_ANA: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: null,
  paidThrough: null,
  timeZone: "Europe/London",
};

const COMMAND = {
  authSubjectId: "user_ana",
  startsAt: OPEN_START,
  clientTimeZone: "Europe/London",
  note: "  Can we look at my squat?  ",
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

function createCheckIns(clientCheckIns: CheckIn[] = []) {
  return {
    listForClientLocked: vi.fn().mockResolvedValue(clientCheckIns),
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
}

function waitingRequest(): CheckIn {
  return CheckIn.reconstitute({
    id: "check-in-0",
    seriesId: null,
    clientId: "client-1",
    startsAt: new Date("2026-06-04T09:00:00.000Z"),
    clientTimeZone: "Europe/London",
    coachTimeZone: "Europe/Bucharest",
    kind: "ad_hoc",
    recordedStatus: "pending",
    initiatedBy: "client",
    proposedBy: "client",
    note: null,
    requestedAt: new Date("2026-05-31T08:30:00.000Z"),
    answeredAt: null,
    earlierStartsAt: null,
    moves: 0,
    newTimeNote: null,
  });
}

function createClients(client: ClientReachReading | null) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(client),
  } satisfies Pick<ClientReachPort, "findByAuthSubjectId">;
}

function createIdentities() {
  return {
    findByClientIds: vi.fn().mockResolvedValue([ANA]),
  } satisfies Pick<ClientIdentitiesPort, "findByClientIds">;
}

function createNotifications() {
  return {
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
}

function createRequestCheckIn(options?: {
  checkIns?: ReturnType<typeof createCheckIns>;
  coachTime?: ReturnType<typeof createCoachTime>;
  client?: ClientReachReading | null;
  notifications?: ReturnType<typeof createNotifications>;
  checkInIncidentsPort?: CheckInIncidentsPort;
}) {
  const ports = {
    checkInsPort: options?.checkIns ?? createCheckIns(),
    clientReachPort: createClients(
      options?.client === undefined ? REACHABLE_ANA : options.client,
    ),
    clockPort: { now: () => NOW },
    coachTimePort: options?.coachTime ?? createCoachTime(),
    clientIdentitiesPort: createIdentities(),
    checkInIdsPort: { generate: () => "check-in-1" },
    checkInIncidentsPort: options?.checkInIncidentsPort ?? {
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
    checkInInboxPort: {
      checkInEvent: vi.fn().mockResolvedValue(undefined),
      seriesEvent: vi.fn().mockResolvedValue(undefined),
      clashesAdded: vi.fn().mockResolvedValue(undefined),
      scheduleExpiries: vi.fn().mockResolvedValue(undefined),
    },
    checkInNotificationsPort: options?.notifications ?? createNotifications(),
    openSlotsPort: workingDays(),
  };

  return { ports, requestCheckInUseCase: new RequestCheckInUseCase(ports) };
}

describe("RequestCheckInUseCase", () => {
  it("records a pending request for an open time with her note and both zones", async () => {
    // arrange
    const { requestCheckInUseCase, ports } = createRequestCheckIn();

    // act
    const result = await requestCheckInUseCase.execute(COMMAND);

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
    expect(ports.checkInsPort.listForClientLocked).toHaveBeenCalledWith(
      "client-1",
    );
    expect(ports.coachTimePort.reserve).toHaveBeenCalledWith({
      start: OPEN_START,
      end: new Date("2026-06-03T10:00:00.000Z"),
    });
    expect(ports.checkInsPort.add).toHaveBeenCalledWith({
      checkIn: expect.any(CheckIn),
      reservationId: "reservation-1",
    });
  });

  it("emails the coach the request with the client's name", async () => {
    // arrange
    const notifications = createNotifications();
    const { requestCheckInUseCase } = createRequestCheckIn({ notifications });

    // act
    await requestCheckInUseCase.execute(COMMAND);

    // assert
    expect(notifications.requested).toHaveBeenCalledWith({
      checkIn: expect.objectContaining({ id: "check-in-1" }),
      client: ANA,
      recipient: "coach",
    });
  });

  it("records no note when she left it blank", async () => {
    // arrange
    const { requestCheckInUseCase } = createRequestCheckIn();

    // act
    const result = await requestCheckInUseCase.execute({
      ...COMMAND,
      note: "   ",
    });

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
    const { requestCheckInUseCase, ports } = createRequestCheckIn();

    // act
    const result = await requestCheckInUseCase.execute({
      ...COMMAND,
      startsAt,
    });

    // assert
    expect(result).toEqual({ status: "time_taken" });
    expect(ports.coachTimePort.reserve).not.toHaveBeenCalled();
  });

  it("refuses the request while her earlier request waits, before holding any time, and emails nobody", async () => {
    // arrange
    const notifications = createNotifications();
    const { requestCheckInUseCase, ports } = createRequestCheckIn({
      checkIns: createCheckIns([waitingRequest()]),
      notifications,
    });

    // act
    const result = await requestCheckInUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "request_waiting" });
    expect(ports.coachTimePort.reserve).not.toHaveBeenCalled();
    expect(notifications.requested).not.toHaveBeenCalled();
  });

  it("refuses the request when the hour was taken meanwhile, storing nothing and emailing nobody", async () => {
    // arrange
    const notifications = createNotifications();
    const { requestCheckInUseCase, ports } = createRequestCheckIn({
      coachTime: createCoachTime({ status: "taken" }),
      notifications,
    });

    // act
    const result = await requestCheckInUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "time_taken" });
    expect(ports.checkInsPort.add).not.toHaveBeenCalled();
    expect(notifications.requested).not.toHaveBeenCalled();
  });

  it.each([
    ["whose coaching ended", { ...REACHABLE_ANA, portal: "ended" }],
    [
      "who has not sent her onboarding",
      { ...REACHABLE_ANA, portal: "awaiting_onboarding" },
    ],
    ["with no client record", null],
  ] as const)("refuses a requester %s", async (_situation, client) => {
    // arrange
    const { requestCheckInUseCase, ports } = createRequestCheckIn({ client });

    // act
    const result = await requestCheckInUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(ports.coachTimePort.reserve).not.toHaveBeenCalled();
  });

  it.each([
    ["at her coaching end", OPEN_START],
    ["after her coaching end", new Date("2026-06-02T09:00:00.000Z")],
  ])(
    "refuses a time when her coaching ends %s without holding it",
    async (_situation, coachingEndsAt) => {
      // arrange
      const { requestCheckInUseCase, ports } = createRequestCheckIn({
        client: { ...REACHABLE_ANA, coachingEndsAt },
      });

      // act
      const result = await requestCheckInUseCase.execute(COMMAND);

      // assert
      expect(result).toEqual({ status: "time_taken" });
      expect(ports.coachTimePort.reserve).not.toHaveBeenCalled();
    },
  );

  it("requests a time that starts before her coaching end", async () => {
    // arrange
    const { requestCheckInUseCase } = createRequestCheckIn({
      client: {
        ...REACHABLE_ANA,
        coachingEndsAt: new Date("2026-06-03T09:00:00.001Z"),
      },
    });

    // act
    const result = await requestCheckInUseCase.execute(COMMAND);

    // assert
    expect(result.status).toBe("requested");
  });

  it("refuses a note longer than 500 characters", async () => {
    // arrange
    const { requestCheckInUseCase, ports } = createRequestCheckIn();

    // act
    const result = await requestCheckInUseCase.execute({
      ...COMMAND,
      note: "a".repeat(501),
    });

    // assert
    expect(result).toEqual({ status: "note_too_long" });
    expect(ports.coachTimePort.reserve).not.toHaveBeenCalled();
  });

  it.each([["Mars/Olympus_Mons"], ["+02:00"], [""]])(
    "refuses the unknown time zone %j",
    async (clientTimeZone) => {
      // arrange
      const { requestCheckInUseCase, ports } = createRequestCheckIn();

      // act
      const result = await requestCheckInUseCase.execute({
        ...COMMAND,
        clientTimeZone,
      });

      // assert
      expect(result).toEqual({ status: "invalid_time_zone" });
      expect(ports.coachTimePort.reserve).not.toHaveBeenCalled();
    },
  );

  it("keeps the request and reports the email the provider refused", async () => {
    // arrange
    const notifications = createNotifications();
    notifications.requested.mockResolvedValue("failed");
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
    const { requestCheckInUseCase } = createRequestCheckIn({
      notifications,
      checkInIncidentsPort: incidents,
    });

    // act
    const result = await requestCheckInUseCase.execute(COMMAND);

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
    const { requestCheckInUseCase } = createRequestCheckIn({
      notifications,
      checkInIncidentsPort: incidents,
    });

    // act
    const result = await requestCheckInUseCase.execute(COMMAND);

    // assert
    expect(result.status).toBe("requested");
    expect(incidents.checkInNotificationFailed).toHaveBeenCalledWith({
      checkInId: "check-in-1",
      notification: "requested",
    });
  });
});
