import { describe, expect, it, vi } from "vitest";

import { ApproveCheckInUseCase } from "./approve-check-in-use-case";
import { CheckIn, type CheckInProps } from "./check-in";
import type { CheckInActor } from "./check-in-actor";
import type { CheckInClient, CheckInClients } from "./check-in-clients";
import type { CheckInNotifications } from "./check-in-notifications";
import type { CheckIns, CheckInSettlement } from "./check-ins";
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
} satisfies CheckInProps;

function checkIn(props?: Partial<CheckInProps>): CheckIn {
  return CheckIn.reconstitute({ ...ANAS_REQUEST, ...props });
}

function coachRequest(props?: Partial<CheckInProps>): CheckIn {
  return checkIn({ initiatedBy: "coach", proposedBy: "coach", ...props });
}

function createPorts(options?: {
  found?: CheckIn | null;
  settlement?: CheckInSettlement;
  client?: CheckInClient | null;
  now?: Date;
}) {
  const checkIns = {
    request: vi.fn(),
    find: vi
      .fn()
      .mockResolvedValue(
        options?.found === undefined ? checkIn() : options.found,
      ),
    listForClient: vi.fn().mockResolvedValue([]),
    listAll: vi.fn().mockResolvedValue([]),
    settle: vi.fn().mockResolvedValue(options?.settlement ?? "settled"),
  } satisfies CheckIns;
  const clients = {
    findByAuthSubjectId: vi
      .fn()
      .mockResolvedValue(
        options?.client === undefined
          ? { clientId: "client-1", portal: "reachable" }
          : options.client,
      ),
    identitiesOf: vi.fn().mockResolvedValue([ANA]),
  } satisfies Pick<CheckInClients, "findByAuthSubjectId" | "identitiesOf">;
  const notifications = {
    requested: vi.fn().mockResolvedValue("sent"),
    withdrawn: vi.fn().mockResolvedValue("sent"),
    approved: vi.fn().mockResolvedValue("sent"),
    declined: vi.fn().mockResolvedValue("sent"),
  } satisfies CheckInNotifications;
  const now = options?.now ?? NOW;

  return {
    checkIns,
    clients,
    clock: { now: () => now },
    incidents: { checkInNotificationFailed: vi.fn() },
    notifications,
  };
}

const ANSWERS = [
  {
    answer: "approve",
    outcome: "approved",
    notification: "approved",
    create: (ports: ReturnType<typeof createPorts>) =>
      new ApproveCheckInUseCase(ports),
  },
  {
    answer: "decline",
    outcome: "cancelled",
    notification: "declined",
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
      const ports = createPorts({ settlement: "not_pending" });

      // act
      const result = await create(ports).execute(command);

      // assert
      expect(result).toEqual({ status: "not_pending" });
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
          client: { clientId: "client-1", portal },
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
      client: { clientId: "client-1", portal: "ended" },
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
    const ports = createPorts({ settlement: "not_pending" });

    // act
    const result = await new WithdrawCheckInRequestUseCase(ports).execute(
      command,
    );

    // assert
    expect(result).toEqual({ status: "not_pending" });
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
    ports.clients.identitiesOf.mockResolvedValue([]);

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
