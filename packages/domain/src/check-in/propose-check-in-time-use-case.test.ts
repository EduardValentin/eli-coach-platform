import { describe, expect, it, vi } from "vitest";

import type {
  ClientIdentities,
  ClientReach,
  ClientReachReading,
} from "../client";
import {
  CoachAvailability,
  type CoachAvailabilitySource,
} from "../coach-availability";

import { CheckIn, type CheckInProps } from "./check-in";
import type { CheckInActor } from "./check-in-actor";
import type { CheckInNotifications } from "./check-in-notifications";
import type { CheckInMove, CheckIns } from "./check-ins";
import { ProposeCheckInTimeUseCase } from "./propose-check-in-time-use-case";

const NOW = new Date("2026-06-01T08:30:00.000Z");
const STARTS_AT = new Date("2026-06-03T09:00:00.000Z");
const NEW_START = new Date("2026-06-04T09:00:00.000Z");
const INSIDE_A_DAY = new Date("2026-06-02T08:00:00.000Z");

const ANA = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
};

const COACH: CheckInActor = { party: "coach" };
const ANA_ACTOR: CheckInActor = { party: "client", authSubjectId: "user_ana" };

const REACHABLE_ANA: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: null,
  paidThrough: null,
  timeZone: "Europe/London",
};

const APPROVED = {
  id: "check-in-1",
  seriesId: null,
  clientId: "client-1",
  startsAt: STARTS_AT,
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  recordedStatus: "approved",
  initiatedBy: "client",
  proposedBy: "client",
  note: "Can we look at my squat?",
  requestedAt: new Date("2026-05-30T08:30:00.000Z"),
  answeredAt: new Date("2026-05-31T12:00:00.000Z"),
  earlierStartsAt: null,
  moves: 0,
  newTimeNote: null,
} satisfies CheckInProps;

const COACH_PROPOSAL = {
  checkInId: "check-in-1",
  actor: COACH,
  startsAt: NEW_START,
  note: "  Something came up on Wednesday.  ",
};

function checkIn(props?: Partial<CheckInProps>): CheckIn {
  return CheckIn.reconstitute({ ...APPROVED, ...props });
}

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

function createProposeCheckInTime(options?: {
  found?: CheckIn | null;
  clientCheckIns?: CheckIn[];
  moved?: CheckInMove;
  reference?: ClientReachReading | null;
  client?: ClientReachReading | null;
}) {
  const checkIns = {
    request: vi.fn(),
    find: vi
      .fn()
      .mockResolvedValue(
        options?.found === undefined ? checkIn() : options.found,
      ),
    listForClient: vi.fn().mockResolvedValue(options?.clientCheckIns ?? []),
    listAll: vi.fn(),
    settle: vi.fn(),
    move: vi.fn().mockResolvedValue(options?.moved ?? "moved"),
    endCoaching: vi.fn(),
  } satisfies CheckIns;
  const clients = {
    findByAuthSubjectId: vi
      .fn()
      .mockResolvedValue(
        options?.client === undefined ? REACHABLE_ANA : options.client,
      ),
    findById: vi
      .fn()
      .mockResolvedValue(
        options?.reference === undefined ? REACHABLE_ANA : options.reference,
      ),
  } satisfies Pick<ClientReach, "findByAuthSubjectId" | "findById">;
  const identities = {
    findByClientIds: vi.fn().mockResolvedValue([ANA]),
  } satisfies Pick<ClientIdentities, "findByClientIds">;
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
  } satisfies CheckInNotifications;
  const ports = {
    availability: workingDays(),
    checkIns,
    clients,
    clock: { now: () => NOW },
    identities,
    incidents: {
      checkInNotificationFailed: vi.fn(),
      awaitingCheckInsCountFailed: vi.fn(),
      awaitingCheckInsListFailed: vi.fn(),
      nextCheckInLookupFailed: vi.fn(),
      checkInSeriesNotificationFailed: vi.fn(),
      checkInSeriesExtensionFailed: vi.fn(),
      checkInSeriesReadFailed: vi.fn(),
    },
    notifications,
  };

  return { ports, proposeCheckInTime: new ProposeCheckInTimeUseCase(ports) };
}

describe("ProposeCheckInTimeUseCase", () => {
  it("moves an approved check-in to the new time, waiting for the client, as it was read", async () => {
    // arrange
    const { proposeCheckInTime, ports } = createProposeCheckInTime();

    // act
    const result = await proposeCheckInTime.execute(COACH_PROPOSAL);

    // assert
    expect(result).toEqual({
      status: "proposed",
      checkIn: expect.objectContaining({
        startsAt: NEW_START,
        recordedStatus: "pending",
        proposedBy: "coach",
        earlierStartsAt: STARTS_AT,
        moves: 1,
        newTimeNote: "Something came up on Wednesday.",
        answeredAt: null,
      }),
    });
    expect(ports.checkIns.move).toHaveBeenCalledWith({
      checkIn: expect.any(CheckIn),
      expected: { recordedStatus: "approved", startsAt: STARTS_AT },
      at: NOW,
    });
  });

  it("moves a clash to the coach's new time from the clash she read, waiting for the client without spending a move", async () => {
    // arrange
    const { proposeCheckInTime, ports } = createProposeCheckInTime({
      found: checkIn({
        seriesId: "series-1",
        kind: "recurring",
        recordedStatus: "clash",
        initiatedBy: "coach",
        proposedBy: "coach",
        note: null,
      }),
    });

    // act
    const result = await proposeCheckInTime.execute(COACH_PROPOSAL);

    // assert
    expect(result).toEqual({
      status: "proposed",
      checkIn: expect.objectContaining({
        startsAt: NEW_START,
        recordedStatus: "pending",
        proposedBy: "coach",
        earlierStartsAt: STARTS_AT,
        moves: 0,
      }),
    });
    expect(ports.checkIns.move).toHaveBeenCalledWith({
      checkIn: expect.any(CheckIn),
      expected: { recordedStatus: "clash", startsAt: STARTS_AT },
      at: NOW,
    });
  });

  it("refuses the client moving a clash her coach is rescheduling", async () => {
    // arrange
    const { proposeCheckInTime, ports } = createProposeCheckInTime({
      found: checkIn({ seriesId: "series-1", recordedStatus: "clash" }),
    });

    // act
    const result = await proposeCheckInTime.execute({
      ...COACH_PROPOSAL,
      actor: ANA_ACTOR,
    });

    // assert
    expect(result).toEqual({ status: "not_your_turn" });
    expect(ports.checkIns.move).not.toHaveBeenCalled();
  });

  describe("on a weekly check-in", () => {
    const WEEKLY = {
      seriesId: "series-1",
      kind: "recurring",
      initiatedBy: "coach",
      proposedBy: "coach",
      note: null,
    } satisfies Partial<CheckInProps>;
    const NEXT_WEEK = checkIn({ ...WEEKLY, id: "week-0" });
    const LATER_WEEK = checkIn({
      ...WEEKLY,
      id: "week-1",
      startsAt: new Date("2026-06-10T09:00:00.000Z"),
    });

    it("refuses the client a later week while an earlier one is upcoming, without moving or emailing", async () => {
      // arrange
      const { proposeCheckInTime, ports } = createProposeCheckInTime({
        found: LATER_WEEK,
        clientCheckIns: [NEXT_WEEK, LATER_WEEK],
      });

      // act
      const result = await proposeCheckInTime.execute({
        ...COACH_PROPOSAL,
        checkInId: "week-1",
        actor: ANA_ACTOR,
      });

      // assert
      expect(result).toEqual({ status: "not_next_weekly" });
      expect(ports.checkIns.listForClient).toHaveBeenCalledWith("client-1");
      expect(ports.checkIns.move).not.toHaveBeenCalled();
      expect(ports.notifications.newTimeProposed).not.toHaveBeenCalled();
    });

    it.each([
      { party: "client", actor: ANA_ACTOR, found: NEXT_WEEK },
      { party: "coach", actor: COACH, found: LATER_WEEK },
    ])("moves the week the $party may move", async ({ actor, found }) => {
      // arrange
      const { proposeCheckInTime, ports } = createProposeCheckInTime({
        found,
        clientCheckIns: [NEXT_WEEK, LATER_WEEK],
      });

      // act
      const result = await proposeCheckInTime.execute({
        ...COACH_PROPOSAL,
        checkInId: found.id,
        actor,
      });

      // assert
      expect(result.status).toBe("proposed");
      expect(ports.checkIns.move).toHaveBeenCalled();
    });
  });

  it("emails the client the coach's new time", async () => {
    // arrange
    const { proposeCheckInTime, ports } = createProposeCheckInTime();

    // act
    await proposeCheckInTime.execute(COACH_PROPOSAL);

    // assert
    expect(ports.notifications.newTimeProposed).toHaveBeenCalledWith({
      checkIn: expect.objectContaining({
        startsAt: NEW_START,
        earlierStartsAt: STARTS_AT,
      }),
      client: ANA,
      recipient: "client",
    });
  });

  it("lets the client counter-propose the coach's request from her zone and emails the coach", async () => {
    // arrange
    const { proposeCheckInTime, ports } = createProposeCheckInTime({
      found: checkIn({
        recordedStatus: "pending",
        initiatedBy: "coach",
        proposedBy: "coach",
        answeredAt: null,
      }),
    });

    // act
    const result = await proposeCheckInTime.execute({
      checkInId: "check-in-1",
      actor: ANA_ACTOR,
      startsAt: NEW_START,
      note: null,
      clientTimeZone: "Asia/Tokyo",
    });

    // assert
    expect(result).toEqual({
      status: "proposed",
      checkIn: expect.objectContaining({
        proposedBy: "client",
        clientTimeZone: "Asia/Tokyo",
        newTimeNote: null,
      }),
    });
    expect(ports.checkIns.move).toHaveBeenCalledWith(
      expect.objectContaining({
        expected: { recordedStatus: "pending", startsAt: STARTS_AT },
      }),
    );
    expect(ports.notifications.newTimeProposed).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: "coach" }),
    );
  });

  it.each([
    {
      situation: "the new time she proposed herself",
      actor: ANA_ACTOR,
      found: checkIn({
        recordedStatus: "pending",
        startsAt: NEW_START,
        earlierStartsAt: STARTS_AT,
        moves: 1,
      }),
      refusal: "not_your_turn",
    },
    {
      situation: "a check-in moved twice",
      actor: COACH,
      found: checkIn({ earlierStartsAt: NEW_START, moves: 2 }),
      refusal: "moves_exhausted",
    },
    {
      situation: "a cancelled check-in",
      actor: COACH,
      found: checkIn({ recordedStatus: "cancelled" }),
      refusal: "not_pending",
    },
  ] as const)(
    "refuses a new time for $situation without moving or emailing",
    async ({ actor, found, refusal }) => {
      // arrange
      const { proposeCheckInTime, ports } = createProposeCheckInTime({
        found,
      });

      // act
      const result = await proposeCheckInTime.execute({
        ...COACH_PROPOSAL,
        actor,
      });

      // assert
      expect(result).toEqual({ status: refusal });
      expect(ports.checkIns.move).not.toHaveBeenCalled();
      expect(ports.notifications.newTimeProposed).not.toHaveBeenCalled();
    },
  );

  it("refuses a new time inside the next 24 hours without moving", async () => {
    // arrange
    const { proposeCheckInTime, ports } = createProposeCheckInTime();

    // act
    const result = await proposeCheckInTime.execute({
      ...COACH_PROPOSAL,
      startsAt: INSIDE_A_DAY,
    });

    // assert
    expect(result).toEqual({ status: "time_taken" });
    expect(ports.checkIns.move).not.toHaveBeenCalled();
  });

  it("refuses a new time at the client's coaching end without moving", async () => {
    // arrange
    const { proposeCheckInTime, ports } = createProposeCheckInTime({
      reference: { ...REACHABLE_ANA, coachingEndsAt: NEW_START },
    });

    // act
    const result = await proposeCheckInTime.execute(COACH_PROPOSAL);

    // assert
    expect(result).toEqual({ status: "time_taken" });
    expect(ports.clients.findById).toHaveBeenCalledWith("client-1");
    expect(ports.checkIns.move).not.toHaveBeenCalled();
  });

  it.each([
    ["the new hour was taken meanwhile", "time_taken"],
    ["the check-in changed meanwhile", "changed_meanwhile"],
  ] as const)(
    "refuses when %s and emails nobody",
    async (_situation, moved) => {
      // arrange
      const { proposeCheckInTime, ports } = createProposeCheckInTime({
        moved,
      });

      // act
      const result = await proposeCheckInTime.execute(COACH_PROPOSAL);

      // assert
      expect(result).toEqual({ status: moved });
      expect(ports.notifications.newTimeProposed).not.toHaveBeenCalled();
    },
  );

  it("answers unknown for another client's check-in", async () => {
    // arrange
    const { proposeCheckInTime, ports } = createProposeCheckInTime({
      found: checkIn({ clientId: "client-2" }),
    });

    // act
    const result = await proposeCheckInTime.execute({
      ...COACH_PROPOSAL,
      actor: ANA_ACTOR,
    });

    // assert
    expect(result).toEqual({ status: "unknown" });
    expect(ports.checkIns.move).not.toHaveBeenCalled();
  });

  it("answers unknown for a check-in that does not exist", async () => {
    // arrange
    const { proposeCheckInTime } = createProposeCheckInTime({ found: null });

    // act
    const result = await proposeCheckInTime.execute(COACH_PROPOSAL);

    // assert
    expect(result).toEqual({ status: "unknown" });
  });

  it("refuses a client whose coaching ended", async () => {
    // arrange
    const { proposeCheckInTime, ports } = createProposeCheckInTime({
      client: { ...REACHABLE_ANA, portal: "ended" },
    });

    // act
    const result = await proposeCheckInTime.execute({
      ...COACH_PROPOSAL,
      actor: ANA_ACTOR,
    });

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(ports.checkIns.move).not.toHaveBeenCalled();
  });

  it("refuses a note longer than 500 characters", async () => {
    // arrange
    const { proposeCheckInTime, ports } = createProposeCheckInTime();

    // act
    const result = await proposeCheckInTime.execute({
      ...COACH_PROPOSAL,
      note: "a".repeat(501),
    });

    // assert
    expect(result).toEqual({ status: "note_too_long" });
    expect(ports.checkIns.find).not.toHaveBeenCalled();
  });

  it("refuses a client zone that names no place", async () => {
    // arrange
    const { proposeCheckInTime, ports } = createProposeCheckInTime();

    // act
    const result = await proposeCheckInTime.execute({
      ...COACH_PROPOSAL,
      actor: ANA_ACTOR,
      clientTimeZone: "+02:00",
    });

    // assert
    expect(result).toEqual({ status: "invalid_time_zone" });
    expect(ports.checkIns.move).not.toHaveBeenCalled();
  });

  it("keeps the new time and reports the email the provider refused", async () => {
    // arrange
    const { proposeCheckInTime, ports } = createProposeCheckInTime();
    ports.notifications.newTimeProposed.mockResolvedValue("failed");

    // act
    const result = await proposeCheckInTime.execute(COACH_PROPOSAL);

    // assert
    expect(result.status).toBe("proposed");
    expect(ports.incidents.checkInNotificationFailed).toHaveBeenCalledWith({
      checkInId: "check-in-1",
      notification: "newTimeProposed",
    });
  });
});
