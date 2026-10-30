import { describe, expect, it, vi } from "vitest";

import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort, ClientReachReading } from "./client-reach-port";

import { ApproveCheckInUseCase } from "./approve-check-in-use-case";
import { CancelCheckInUseCase } from "./cancel-check-in-use-case";
import { CheckIn, type CheckInProps } from "./check-in";
import type { CheckInActor } from "./check-in-actor";
import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import type { CheckInsPort, CheckInSettlement } from "./check-ins-port";
import { DeclineCheckInUseCase } from "./decline-check-in-use-case";
import { WithdrawCheckInRequestUseCase } from "./withdraw-check-in-request-use-case";

const NOW = new Date("2026-06-02T09:00:00.000Z");
const STARTS_AT = new Date("2026-06-03T09:00:00.000Z");

const ANA = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
};

const COACH: CheckInActor = { party: "coach" };
const ANA_ACTOR: CheckInActor = { party: "client", authSubjectId: "user_ana" };

const ANAS_REQUEST = {
  id: "check-in-1",
  seriesId: null,
  clientId: "client-1",
  startsAt: STARTS_AT,
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  recordedStatus: "pending",
  initiatedBy: "client",
  proposedBy: "client",
  note: null,
  requestedAt: new Date("2026-06-01T08:30:00.000Z"),
  answeredAt: null,
  earlierStartsAt: null,
  moves: 0,
  newTimeNote: null,
} satisfies CheckInProps;

function checkIn(props?: Partial<CheckInProps>): CheckIn {
  return CheckIn.reconstitute({ ...ANAS_REQUEST, ...props });
}

function coachRequest(props?: Partial<CheckInProps>): CheckIn {
  return checkIn({ initiatedBy: "coach", proposedBy: "coach", ...props });
}

function newTimeFromCoach(props?: Partial<CheckInProps>): CheckIn {
  return checkIn({
    proposedBy: "coach",
    earlierStartsAt: new Date("2026-06-02T15:00:00.000Z"),
    moves: 1,
    newTimeNote: "Could we do Wednesday instead?",
    ...props,
  });
}

function approvedCheckIn(props?: Partial<CheckInProps>): CheckIn {
  return checkIn({
    recordedStatus: "approved",
    answeredAt: new Date("2026-06-01T12:00:00.000Z"),
    ...props,
  });
}

function createPorts(options?: {
  found?: CheckIn | null;
  settlement?: CheckInSettlement;
  client?: ClientReachReading | null;
  now?: Date;
}) {
  const checkIns = {
    listForClientLocked: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(undefined),
    find: vi
      .fn()
      .mockResolvedValue(
        options?.found === undefined ? checkIn() : options.found,
      ),
    listForClient: vi.fn().mockResolvedValue([]),
    listAll: vi.fn().mockResolvedValue([]),
    settle: vi
      .fn()
      .mockResolvedValue(
        options?.settlement ?? { status: "settled", freedReservationId: null },
      ),
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
    findByAuthSubjectId: vi.fn().mockResolvedValue(
      options?.client === undefined
        ? {
            clientId: "client-1",
            portal: "reachable",
            coachingEndsAt: null,
            programStartsAt: null,
            paidThrough: null,
            timeZone: "Europe/London",
          }
        : options.client,
    ),
  } satisfies Pick<ClientReachPort, "findByAuthSubjectId">;
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
  const now = options?.now ?? NOW;

  return {
    checkIns,
    clients,
    clock: { now: () => now },
    coachTime: { release: vi.fn().mockResolvedValue(undefined) },
    identities,
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
  };
}

const ANSWERS = [
  {
    answer: "approve",
    outcome: "approved",
    notification: "approved",
    newTimeNotification: "newTimeAccepted",
    create: (ports: ReturnType<typeof createPorts>) =>
      new ApproveCheckInUseCase(ports),
  },
  {
    answer: "decline",
    outcome: "cancelled",
    notification: "declined",
    newTimeNotification: "newTimeDeclined",
    create: (ports: ReturnType<typeof createPorts>) =>
      new DeclineCheckInUseCase(ports),
  },
] as const;

describe.each(ANSWERS)(
  "the coach's $answer",
  ({ outcome, notification, create }) => {
    const command = { checkInId: "check-in-1", actor: COACH };

    it(`settles the request as ${outcome} at the clock's instant`, async () => {
      // arrange
      const ports = createPorts();

      // act
      const result = await create(ports).execute(command);

      // assert
      expect(result).toEqual({
        status: notification,
        checkIn: expect.objectContaining({
          id: "check-in-1",
          recordedStatus: outcome,
          answeredAt: NOW,
        }),
      });
      expect(ports.checkIns.settle).toHaveBeenCalledWith({
        id: "check-in-1",
        outcome,
        at: NOW,
        expectedStatus: "pending",
      });
    });

    it(`emails the client that her request was ${notification}`, async () => {
      // arrange
      const ports = createPorts();

      // act
      await create(ports).execute(command);

      // assert
      expect(ports.notifications[notification]).toHaveBeenCalledWith({
        checkIn: expect.objectContaining({ recordedStatus: outcome }),
        client: ANA,
        recipient: "client",
      });
    });

    it("ignores a zone sent with the coach's answer", async () => {
      // arrange
      const ports = createPorts();

      // act
      const result = await create(ports).execute({
        ...command,
        clientTimeZone: "Asia/Tokyo",
      });

      // assert
      expect(result).toEqual({
        status: notification,
        checkIn: expect.objectContaining({ clientTimeZone: "Europe/London" }),
      });
      expect(ports.checkIns.settle).toHaveBeenCalledWith({
        id: "check-in-1",
        outcome,
        at: NOW,
        expectedStatus: "pending",
      });
    });

    it.each([
      [
        "an approved check-in",
        checkIn({ recordedStatus: "approved" }),
        NOW,
        "not_pending",
      ],
      [
        "a withdrawn request",
        checkIn({ recordedStatus: "cancelled" }),
        NOW,
        "not_pending",
      ],
      ["a request that reached its start", checkIn(), STARTS_AT, "expired"],
      [
        "a time the coach proposed herself",
        coachRequest(),
        NOW,
        "not_your_turn",
      ],
    ] as const)(
      "refuses %s without settling or emailing",
      async (_situation, found, now, refusal) => {
        // arrange
        const ports = createPorts({ found, now });

        // act
        const result = await create(ports).execute(command);

        // assert
        expect(result).toEqual({ status: refusal });
        expect(ports.checkIns.settle).not.toHaveBeenCalled();
        expect(ports.notifications[notification]).not.toHaveBeenCalled();
      },
    );

    it("answers unknown for a check-in that does not exist", async () => {
      // arrange
      const ports = createPorts({ found: null });

      // act
      const result = await create(ports).execute({
        ...command,
        checkInId: "check-in-404",
      });

      // assert
      expect(result).toEqual({ status: "unknown" });
    });

    it("refuses when another answer settled the request first", async () => {
      // arrange
      const ports = createPorts({
        settlement: { status: "changed_meanwhile" },
      });

      // act
      const result = await create(ports).execute(command);

      // assert
      expect(result).toEqual({ status: "changed_meanwhile" });
      expect(ports.notifications[notification]).not.toHaveBeenCalled();
    });

    it("keeps the answer and reports the email that failed", async () => {
      // arrange
      const ports = createPorts();
      ports.notifications[notification].mockRejectedValue(new Error("down"));

      // act
      const result = await create(ports).execute(command);

      // assert
      expect(result.status).toBe(notification);
      expect(ports.incidents.checkInNotificationFailed).toHaveBeenCalledWith({
        checkInId: "check-in-1",
        notification,
      });
    });
  },
);

describe.each(ANSWERS)(
  "the $answer of a new time",
  ({ outcome, notification, newTimeNotification, create }) => {
    const command = {
      checkInId: "check-in-1",
      actor: ANA_ACTOR,
      clientTimeZone: "Europe/London",
    };

    it(`settles the new time as ${outcome} and keeps its earlier time`, async () => {
      // arrange
      const ports = createPorts({ found: newTimeFromCoach() });

      // act
      const result = await create(ports).execute(command);

      // assert
      expect(result).toEqual({
        status: notification,
        checkIn: expect.objectContaining({
          recordedStatus: outcome,
          earlierStartsAt: new Date("2026-06-02T15:00:00.000Z"),
          moves: 1,
        }),
      });
    });

    it(`emails the coach who proposed it with ${newTimeNotification}`, async () => {
      // arrange
      const ports = createPorts({ found: newTimeFromCoach() });

      // act
      await create(ports).execute(command);

      // assert
      expect(ports.notifications[newTimeNotification]).toHaveBeenCalledWith({
        checkIn: expect.objectContaining({ id: "check-in-1" }),
        client: ANA,
        recipient: "coach",
      });
      expect(ports.notifications[notification]).not.toHaveBeenCalled();
    });

    it("refuses the coach answering the new time she proposed", async () => {
      // arrange
      const ports = createPorts({ found: newTimeFromCoach() });

      // act
      const result = await create(ports).execute({
        checkInId: "check-in-1",
        actor: COACH,
      });

      // assert
      expect(result).toEqual({ status: "not_your_turn" });
      expect(ports.checkIns.settle).not.toHaveBeenCalled();
    });
  },
);

describe.each(ANSWERS)(
  "the client's $answer of the coach's request",
  ({ outcome, notification, create }) => {
    const command = {
      checkInId: "check-in-1",
      actor: ANA_ACTOR,
      clientTimeZone: "Asia/Tokyo",
    };

    it(`settles it as ${outcome} and records the zone she answered from`, async () => {
      // arrange
      const ports = createPorts({ found: coachRequest() });

      // act
      const result = await create(ports).execute(command);

      // assert
      expect(result).toEqual({
        status: notification,
        checkIn: expect.objectContaining({
          recordedStatus: outcome,
          clientTimeZone: "Asia/Tokyo",
          answeredAt: NOW,
        }),
      });
      expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith(
        "user_ana",
      );
      expect(ports.checkIns.settle).toHaveBeenCalledWith({
        id: "check-in-1",
        outcome,
        at: NOW,
        expectedStatus: "pending",
        clientTimeZone: "Asia/Tokyo",
      });
    });

    it(`emails the coach that the client ${notification} it`, async () => {
      // arrange
      const ports = createPorts({ found: coachRequest() });

      // act
      await create(ports).execute(command);

      // assert
      expect(ports.notifications[notification]).toHaveBeenCalledWith({
        checkIn: expect.objectContaining({ clientTimeZone: "Asia/Tokyo" }),
        client: ANA,
        recipient: "coach",
      });
    });

    it("keeps the recorded zone when her answer names none", async () => {
      // arrange
      const ports = createPorts({ found: coachRequest() });

      // act
      await create(ports).execute({
        checkInId: "check-in-1",
        actor: ANA_ACTOR,
      });

      // assert
      expect(ports.checkIns.settle).toHaveBeenCalledWith({
        id: "check-in-1",
        outcome,
        at: NOW,
        expectedStatus: "pending",
      });
    });

    it("refuses her answer to her own request", async () => {
      // arrange
      const ports = createPorts({ found: checkIn() });

      // act
      const result = await create(ports).execute(command);

      // assert
      expect(result).toEqual({ status: "not_your_turn" });
      expect(ports.checkIns.settle).not.toHaveBeenCalled();
    });

    it("answers unknown for another client's check-in", async () => {
      // arrange
      const ports = createPorts({
        found: coachRequest({ clientId: "client-2" }),
      });

      // act
      const result = await create(ports).execute(command);

      // assert
      expect(result).toEqual({ status: "unknown" });
      expect(ports.checkIns.settle).not.toHaveBeenCalled();
    });

    it.each([["awaiting_onboarding"], ["ended"]] as const)(
      "answers ended to a client whose portal reach is %s",
      async (portal) => {
        // arrange
        const ports = createPorts({
          found: coachRequest(),
          client: {
            clientId: "client-1",
            portal,
            coachingEndsAt: null,
            programStartsAt: null,
            paidThrough: null,
            timeZone: "Europe/London",
          },
        });

        // act
        const result = await create(ports).execute(command);

        // assert
        expect(result).toEqual({ status: "ended" });
        expect(ports.checkIns.settle).not.toHaveBeenCalled();
      },
    );

    it("refuses a zone that names no place without settling", async () => {
      // arrange
      const ports = createPorts({ found: coachRequest() });

      // act
      const result = await create(ports).execute({
        ...command,
        clientTimeZone: "+02:00",
      });

      // assert
      expect(result).toEqual({ status: "invalid_time_zone" });
      expect(ports.checkIns.settle).not.toHaveBeenCalled();
    });
  },
);

describe("WithdrawCheckInRequestUseCase", () => {
  const command = { checkInId: "check-in-1", actor: ANA_ACTOR };

  it("cancels her pending request at the clock's instant and emails the coach", async () => {
    // arrange
    const ports = createPorts();

    // act
    const result = await new WithdrawCheckInRequestUseCase(ports).execute(
      command,
    );

    // assert
    expect(result).toEqual({
      status: "withdrawn",
      checkIn: expect.objectContaining({ recordedStatus: "cancelled" }),
    });
    expect(ports.checkIns.settle).toHaveBeenCalledWith({
      id: "check-in-1",
      outcome: "cancelled",
      at: NOW,
      expectedStatus: "pending",
    });
    expect(ports.notifications.withdrawn).toHaveBeenCalledWith({
      checkIn: expect.objectContaining({ id: "check-in-1" }),
      client: ANA,
      recipient: "coach",
    });
  });

  it("cancels the coach's own pending request and emails the client", async () => {
    // arrange
    const ports = createPorts({ found: coachRequest() });

    // act
    const result = await new WithdrawCheckInRequestUseCase(ports).execute({
      checkInId: "check-in-1",
      actor: COACH,
    });

    // assert
    expect(result).toEqual({
      status: "withdrawn",
      checkIn: expect.objectContaining({ recordedStatus: "cancelled" }),
    });
    expect(ports.clients.findByAuthSubjectId).not.toHaveBeenCalled();
    expect(ports.notifications.withdrawn).toHaveBeenCalledWith({
      checkIn: expect.objectContaining({ id: "check-in-1" }),
      client: ANA,
      recipient: "client",
    });
  });

  it.each([
    [
      "an approved check-in",
      ANA_ACTOR,
      checkIn({ recordedStatus: "approved" }),
      NOW,
      "not_pending",
    ],
    [
      "a request that reached its start",
      ANA_ACTOR,
      checkIn(),
      STARTS_AT,
      "expired",
    ],
    [
      "the coach's request as the client",
      ANA_ACTOR,
      coachRequest(),
      NOW,
      "not_your_turn",
    ],
    [
      "the client's request as the coach",
      COACH,
      checkIn(),
      NOW,
      "not_your_turn",
    ],
  ] as const)(
    "refuses withdrawing %s without settling or emailing",
    async (_situation, actor, found, now, refusal) => {
      // arrange
      const ports = createPorts({ found, now });

      // act
      const result = await new WithdrawCheckInRequestUseCase(ports).execute({
        checkInId: "check-in-1",
        actor,
      });

      // assert
      expect(result).toEqual({ status: refusal });
      expect(ports.checkIns.settle).not.toHaveBeenCalled();
      expect(ports.notifications.withdrawn).not.toHaveBeenCalled();
    },
  );

  it("refuses the coach taking back a new time she proposed", async () => {
    // arrange
    const ports = createPorts({ found: newTimeFromCoach() });

    // act
    const result = await new WithdrawCheckInRequestUseCase(ports).execute({
      checkInId: "check-in-1",
      actor: COACH,
    });

    // assert
    expect(result).toEqual({ status: "not_your_turn" });
    expect(ports.checkIns.settle).not.toHaveBeenCalled();
  });

  it("answers unknown for another client's request", async () => {
    // arrange
    const ports = createPorts({ found: checkIn({ clientId: "client-2" }) });

    // act
    const result = await new WithdrawCheckInRequestUseCase(ports).execute(
      command,
    );

    // assert
    expect(result).toEqual({ status: "unknown" });
    expect(ports.checkIns.settle).not.toHaveBeenCalled();
  });

  it("answers unknown for a check-in that does not exist", async () => {
    // arrange
    const ports = createPorts({ found: null });

    // act
    const result = await new WithdrawCheckInRequestUseCase(ports).execute(
      command,
    );

    // assert
    expect(result).toEqual({ status: "unknown" });
  });

  it("refuses a client whose coaching ended", async () => {
    // arrange
    const ports = createPorts({
      client: {
        clientId: "client-1",
        portal: "ended",
        coachingEndsAt: null,
        programStartsAt: null,
        paidThrough: null,
        timeZone: "Europe/London",
      },
    });

    // act
    const result = await new WithdrawCheckInRequestUseCase(ports).execute(
      command,
    );

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(ports.checkIns.settle).not.toHaveBeenCalled();
  });

  it("refuses when the coach answered first", async () => {
    // arrange
    const ports = createPorts({ settlement: { status: "changed_meanwhile" } });

    // act
    const result = await new WithdrawCheckInRequestUseCase(ports).execute(
      command,
    );

    // assert
    expect(result).toEqual({ status: "changed_meanwhile" });
    expect(ports.notifications.withdrawn).not.toHaveBeenCalled();
  });

  it("keeps the withdrawal and reports the email the provider refused", async () => {
    // arrange
    const ports = createPorts();
    ports.notifications.withdrawn.mockResolvedValue("failed");

    // act
    const result = await new WithdrawCheckInRequestUseCase(ports).execute(
      command,
    );

    // assert
    expect(result.status).toBe("withdrawn");
    expect(ports.incidents.checkInNotificationFailed).toHaveBeenCalledWith({
      checkInId: "check-in-1",
      notification: "withdrawn",
    });
  });

  it("reports the email when her identity cannot be read", async () => {
    // arrange
    const ports = createPorts();
    ports.identities.findByClientIds.mockResolvedValue([]);

    // act
    const result = await new WithdrawCheckInRequestUseCase(ports).execute(
      command,
    );

    // assert
    expect(result.status).toBe("withdrawn");
    expect(ports.notifications.withdrawn).not.toHaveBeenCalled();
    expect(ports.incidents.checkInNotificationFailed).toHaveBeenCalledWith({
      checkInId: "check-in-1",
      notification: "withdrawn",
    });
  });
});

describe("CancelCheckInUseCase", () => {
  it.each([
    { canceller: "client", actor: ANA_ACTOR, recipient: "coach" },
    { canceller: "coach", actor: COACH, recipient: "client" },
  ] as const)(
    "cancels an approved check-in the $canceller requested from approved and emails the $recipient",
    async ({ canceller, actor, recipient }) => {
      // arrange
      const ports = createPorts({
        found: approvedCheckIn({
          initiatedBy: canceller,
          proposedBy: canceller,
        }),
        settlement: { status: "settled", freedReservationId: "reservation-1" },
      });

      // act
      const result = await new CancelCheckInUseCase(ports).execute({
        checkInId: "check-in-1",
        actor,
      });

      // assert
      expect(result).toEqual({
        status: "cancelled",
        checkIn: expect.objectContaining({
          recordedStatus: "cancelled",
          answeredAt: NOW,
        }),
      });
      expect(ports.checkIns.settle).toHaveBeenCalledWith({
        id: "check-in-1",
        outcome: "cancelled",
        at: NOW,
        expectedStatus: "approved",
      });
      expect(ports.coachTime.release).toHaveBeenCalledWith("reservation-1");
      expect(ports.notifications.cancelled).toHaveBeenCalledWith({
        checkIn: expect.objectContaining({ id: "check-in-1" }),
        client: ANA,
        recipient,
      });
    },
  );

  it.each([
    ["a waiting request", checkIn(), NOW, "not_approved"],
    [
      "a cancelled check-in",
      checkIn({ recordedStatus: "cancelled" }),
      NOW,
      "not_approved",
    ],
    [
      "an approved check-in that has started",
      approvedCheckIn(),
      STARTS_AT,
      "expired",
    ],
  ] as const)(
    "refuses cancelling %s without settling or emailing",
    async (_situation, found, now, refusal) => {
      // arrange
      const ports = createPorts({ found, now });

      // act
      const result = await new CancelCheckInUseCase(ports).execute({
        checkInId: "check-in-1",
        actor: COACH,
      });

      // assert
      expect(result).toEqual({ status: refusal });
      expect(ports.checkIns.settle).not.toHaveBeenCalled();
      expect(ports.notifications.cancelled).not.toHaveBeenCalled();
    },
  );

  it.each([
    { canceller: "client", actor: ANA_ACTOR, requester: "coach" },
    { canceller: "coach", actor: COACH, requester: "client" },
  ] as const)(
    "refuses the $canceller cancelling an approved check-in the $requester requested",
    async ({ actor, requester }) => {
      // arrange
      const ports = createPorts({
        found: approvedCheckIn({
          initiatedBy: requester,
          proposedBy: requester,
        }),
      });

      // act
      const result = await new CancelCheckInUseCase(ports).execute({
        checkInId: "check-in-1",
        actor,
      });

      // assert
      expect(result).toEqual({ status: "not_allowed" });
      expect(ports.checkIns.settle).not.toHaveBeenCalled();
      expect(ports.notifications.cancelled).not.toHaveBeenCalled();
    },
  );

  it("lets the coach cancel a clash, settling it from the clash she read", async () => {
    // arrange
    const ports = createPorts({
      found: approvedCheckIn({
        seriesId: "series-1",
        kind: "recurring",
        recordedStatus: "clash",
      }),
    });

    // act
    const result = await new CancelCheckInUseCase(ports).execute({
      checkInId: "check-in-1",
      actor: COACH,
    });

    // assert
    expect(result).toMatchObject({ status: "cancelled" });
    expect(ports.checkIns.settle).toHaveBeenCalledWith({
      id: "check-in-1",
      outcome: "cancelled",
      at: NOW,
      expectedStatus: "clash",
    });
  });

  it("refuses the client cancelling her approved weekly check-in", async () => {
    // arrange
    const ports = createPorts({
      found: approvedCheckIn({ seriesId: "series-1", kind: "recurring" }),
    });

    // act
    const result = await new CancelCheckInUseCase(ports).execute({
      checkInId: "check-in-1",
      actor: ANA_ACTOR,
    });

    // assert
    expect(result).toEqual({ status: "not_allowed" });
    expect(ports.checkIns.settle).not.toHaveBeenCalled();
  });

  it("refuses when the check-in stopped being approved meanwhile", async () => {
    // arrange
    const ports = createPorts({
      found: approvedCheckIn(),
      settlement: { status: "changed_meanwhile" },
    });

    // act
    const result = await new CancelCheckInUseCase(ports).execute({
      checkInId: "check-in-1",
      actor: ANA_ACTOR,
    });

    // assert
    expect(result).toEqual({ status: "changed_meanwhile" });
    expect(ports.notifications.cancelled).not.toHaveBeenCalled();
  });

  it("answers unknown for another client's check-in", async () => {
    // arrange
    const ports = createPorts({
      found: approvedCheckIn({ clientId: "client-2" }),
    });

    // act
    const result = await new CancelCheckInUseCase(ports).execute({
      checkInId: "check-in-1",
      actor: ANA_ACTOR,
    });

    // assert
    expect(result).toEqual({ status: "unknown" });
  });

  it("keeps the cancellation and reports the email the provider refused", async () => {
    // arrange
    const ports = createPorts({
      found: approvedCheckIn({ initiatedBy: "coach", proposedBy: "coach" }),
    });
    ports.notifications.cancelled.mockResolvedValue("failed");

    // act
    const result = await new CancelCheckInUseCase(ports).execute({
      checkInId: "check-in-1",
      actor: COACH,
    });

    // assert
    expect(result.status).toBe("cancelled");
    expect(ports.incidents.checkInNotificationFailed).toHaveBeenCalledWith({
      checkInId: "check-in-1",
      notification: "cancelled",
    });
  });
});
