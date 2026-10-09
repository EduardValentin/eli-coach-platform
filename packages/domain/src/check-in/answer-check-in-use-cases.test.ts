import { describe, expect, it, vi } from "vitest";

import { ApproveCheckInUseCase } from "./approve-check-in-use-case";
import { CheckIn, type CheckInProps } from "./check-in";
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
  } satisfies CheckInClients;
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
    incidents: { notificationFailed: vi.fn() },
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
    it(`settles the request as ${outcome} at the clock's instant`, async () => {
      // arrange
      const ports = createPorts();

      // act
      const result = await create(ports).execute("check-in-1");

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
      await create(ports).execute("check-in-1");

      // assert
      expect(ports.notifications[notification]).toHaveBeenCalledWith({
        checkIn: expect.objectContaining({ recordedStatus: outcome }),
        client: ANA,
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
        checkIn({ initiatedBy: "coach", proposedBy: "coach" }),
        NOW,
        "not_your_turn",
      ],
    ] as const)(
      "refuses %s without settling or emailing",
      async (_situation, found, now, refusal) => {
        // arrange
        const ports = createPorts({ found, now });

        // act
        const result = await create(ports).execute("check-in-1");

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
      const result = await create(ports).execute("check-in-404");

      // assert
      expect(result).toEqual({ status: "unknown" });
    });

    it("refuses when another answer settled the request first", async () => {
      // arrange
      const ports = createPorts({ settlement: "not_pending" });

      // act
      const result = await create(ports).execute("check-in-1");

      // assert
      expect(result).toEqual({ status: "not_pending" });
      expect(ports.notifications[notification]).not.toHaveBeenCalled();
    });

    it("keeps the answer and reports the email that failed", async () => {
      // arrange
      const ports = createPorts();
      ports.notifications[notification].mockRejectedValue(new Error("down"));

      // act
      const result = await create(ports).execute("check-in-1");

      // assert
      expect(result.status).toBe(notification);
      expect(ports.incidents.notificationFailed).toHaveBeenCalledWith({
        checkInId: "check-in-1",
        notification,
      });
    });
  },
);

describe("WithdrawCheckInRequestUseCase", () => {
  const command = { authSubjectId: "user_ana", checkInId: "check-in-1" };

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
    });
  });

  it.each([
    [
      "an approved check-in",
      checkIn({ recordedStatus: "approved" }),
      NOW,
      "not_pending",
    ],
    ["a request that reached its start", checkIn(), STARTS_AT, "expired"],
    [
      "a time the coach proposed",
      checkIn({ initiatedBy: "coach", proposedBy: "coach" }),
      NOW,
      "not_your_turn",
    ],
  ] as const)(
    "refuses withdrawing %s without settling or emailing",
    async (_situation, found, now, refusal) => {
      // arrange
      const ports = createPorts({ found, now });

      // act
      const result = await new WithdrawCheckInRequestUseCase(ports).execute(
        command,
      );

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
      client: { clientId: "client-1", portal: "unreachable" },
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
    expect(ports.incidents.notificationFailed).toHaveBeenCalledWith({
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
    expect(ports.incidents.notificationFailed).toHaveBeenCalledWith({
      checkInId: "check-in-1",
      notification: "withdrawn",
    });
  });
});
