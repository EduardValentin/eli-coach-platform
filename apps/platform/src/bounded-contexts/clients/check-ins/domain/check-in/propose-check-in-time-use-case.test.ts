import { describe, expect, it, vi } from "vitest";

import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort, ClientReachReading } from "./client-reach-port";

import { CheckIn, type CheckInProps } from "./check-in";
import type { CheckInActor } from "./check-in-actor";
import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import type { CheckInMove, CheckInsPort } from "./check-ins-port";
import type { CoachTimeHold } from "./coach-time-port";
import type { OpenSlotsPort } from "./open-slots-port";
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

const ONE_DAY_MS = 24 * 60 * 60 * 1_000;

function startsBeyondADay() {
  return {
    offersStart: vi.fn(
      async ({ start, now }: { start: Date; now: Date }) =>
        start.getTime() - now.getTime() >= ONE_DAY_MS,
    ),
  } satisfies Pick<OpenSlotsPort, "offersStart">;
}

function createProposeCheckInTime(options?: {
  found?: CheckIn | null;
  clientCheckIns?: CheckIn[];
  moved?: CheckInMove;
  hold?: CoachTimeHold;
  reference?: ClientReachReading | null;
  client?: ClientReachReading | null;
}) {
  const checkIns = {
    listForClientLocked: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(undefined),
    find: vi
      .fn()
      .mockResolvedValue(
        options?.found === undefined ? checkIn() : options.found,
      ),
    listForClient: vi.fn().mockResolvedValue(options?.clientCheckIns ?? []),
    listAll: vi.fn(),
    settle: vi.fn(),
    move: vi
      .fn()
      .mockResolvedValue(
        options?.moved ?? { status: "moved", freedReservationId: null },
      ),
    endCoaching: vi.fn(),
  } satisfies CheckInsPort;
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
  } satisfies Pick<ClientReachPort, "findByAuthSubjectId" | "findById">;
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
    checkInsPort: checkIns,
    clientReachPort: clients,
    clockPort: { now: () => NOW },
    coachTimePort: {
      reserve: vi.fn().mockResolvedValue(
        options?.hold ?? {
          status: "reserved",
          reservationId: "reservation-2",
        },
      ),
      release: vi.fn().mockResolvedValue(undefined),
    },
    clientIdentitiesPort: identities,
    checkInIncidentsPort: {
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
    checkInNotificationsPort: notifications,
    openSlotsPort: startsBeyondADay(),
  };

  return {
    ports,
    proposeCheckInTimeUseCase: new ProposeCheckInTimeUseCase(ports),
  };
}

describe("ProposeCheckInTimeUseCase", () => {
  it("moves an approved check-in to the new time, waiting for the client, as it was read", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime({
      moved: { status: "moved", freedReservationId: "reservation-1" },
    });

    // act
    const result = await proposeCheckInTimeUseCase.execute(COACH_PROPOSAL);

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
    expect(ports.coachTimePort.reserve).toHaveBeenCalledWith({
      start: NEW_START,
      end: new Date("2026-06-04T10:00:00.000Z"),
    });
    expect(ports.checkInsPort.move).toHaveBeenCalledWith({
      checkIn: expect.any(CheckIn),
      expected: { recordedStatus: "approved", startsAt: STARTS_AT },
      reservationId: "reservation-2",
      at: NOW,
    });
    expect(ports.coachTimePort.release).toHaveBeenCalledWith("reservation-1");
  });

  it("moves a clash to the coach's new time from the clash she read, waiting for the client without spending a move", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime({
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
    const result = await proposeCheckInTimeUseCase.execute(COACH_PROPOSAL);

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
    expect(ports.checkInsPort.move).toHaveBeenCalledWith({
      checkIn: expect.any(CheckIn),
      expected: { recordedStatus: "clash", startsAt: STARTS_AT },
      reservationId: "reservation-2",
      at: NOW,
    });
  });

  it("refuses the client moving a clash her coach is rescheduling", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime({
      found: checkIn({ seriesId: "series-1", recordedStatus: "clash" }),
    });

    // act
    const result = await proposeCheckInTimeUseCase.execute({
      ...COACH_PROPOSAL,
      actor: ANA_ACTOR,
    });

    // assert
    expect(result).toEqual({ status: "not_your_turn" });
    expect(ports.checkInsPort.move).not.toHaveBeenCalled();
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
      const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime({
        found: LATER_WEEK,
        clientCheckIns: [NEXT_WEEK, LATER_WEEK],
      });

      // act
      const result = await proposeCheckInTimeUseCase.execute({
        ...COACH_PROPOSAL,
        checkInId: "week-1",
        actor: ANA_ACTOR,
      });

      // assert
      expect(result).toEqual({ status: "not_next_weekly" });
      expect(ports.checkInsPort.listForClient).toHaveBeenCalledWith("client-1");
      expect(ports.checkInsPort.move).not.toHaveBeenCalled();
      expect(
        ports.checkInNotificationsPort.newTimeProposed,
      ).not.toHaveBeenCalled();
    });

    it.each([
      { party: "client", actor: ANA_ACTOR, found: NEXT_WEEK },
      { party: "coach", actor: COACH, found: LATER_WEEK },
    ])("moves the week the $party may move", async ({ actor, found }) => {
      // arrange
      const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime({
        found,
        clientCheckIns: [NEXT_WEEK, LATER_WEEK],
      });

      // act
      const result = await proposeCheckInTimeUseCase.execute({
        ...COACH_PROPOSAL,
        checkInId: found.id,
        actor,
      });

      // assert
      expect(result.status).toBe("proposed");
      expect(ports.checkInsPort.move).toHaveBeenCalled();
    });
  });

  it("emails the client the coach's new time", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime();

    // act
    await proposeCheckInTimeUseCase.execute(COACH_PROPOSAL);

    // assert
    expect(ports.checkInNotificationsPort.newTimeProposed).toHaveBeenCalledWith(
      {
        checkIn: expect.objectContaining({
          startsAt: NEW_START,
          earlierStartsAt: STARTS_AT,
        }),
        client: ANA,
        recipient: "client",
      },
    );
  });

  it("lets the client counter-propose the coach's request from her zone and emails the coach", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime({
      found: checkIn({
        recordedStatus: "pending",
        initiatedBy: "coach",
        proposedBy: "coach",
        answeredAt: null,
      }),
    });

    // act
    const result = await proposeCheckInTimeUseCase.execute({
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
    expect(ports.checkInsPort.move).toHaveBeenCalledWith(
      expect.objectContaining({
        expected: { recordedStatus: "pending", startsAt: STARTS_AT },
      }),
    );
    expect(ports.checkInNotificationsPort.newTimeProposed).toHaveBeenCalledWith(
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
      const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime({
        found,
      });

      // act
      const result = await proposeCheckInTimeUseCase.execute({
        ...COACH_PROPOSAL,
        actor,
      });

      // assert
      expect(result).toEqual({ status: refusal });
      expect(ports.checkInsPort.move).not.toHaveBeenCalled();
      expect(
        ports.checkInNotificationsPort.newTimeProposed,
      ).not.toHaveBeenCalled();
    },
  );

  it("refuses a new time inside the next 24 hours without moving", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime();

    // act
    const result = await proposeCheckInTimeUseCase.execute({
      ...COACH_PROPOSAL,
      startsAt: INSIDE_A_DAY,
    });

    // assert
    expect(result).toEqual({ status: "time_taken" });
    expect(ports.checkInsPort.move).not.toHaveBeenCalled();
  });

  it("refuses a new time at the client's coaching end without moving", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime({
      reference: { ...REACHABLE_ANA, coachingEndsAt: NEW_START },
    });

    // act
    const result = await proposeCheckInTimeUseCase.execute(COACH_PROPOSAL);

    // assert
    expect(result).toEqual({ status: "time_taken" });
    expect(ports.clientReachPort.findById).toHaveBeenCalledWith("client-1");
    expect(ports.checkInsPort.move).not.toHaveBeenCalled();
  });

  it("refuses when the new hour was taken meanwhile, moving nothing and emailing nobody", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime({
      hold: { status: "taken" },
    });

    // act
    const result = await proposeCheckInTimeUseCase.execute(COACH_PROPOSAL);

    // assert
    expect(result).toEqual({ status: "time_taken" });
    expect(ports.checkInsPort.move).not.toHaveBeenCalled();
    expect(
      ports.checkInNotificationsPort.newTimeProposed,
    ).not.toHaveBeenCalled();
  });

  it("refuses when the check-in changed meanwhile, giving back the new hour and emailing nobody", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime({
      moved: { status: "changed_meanwhile" },
    });

    // act
    const result = await proposeCheckInTimeUseCase.execute(COACH_PROPOSAL);

    // assert
    expect(result).toEqual({ status: "changed_meanwhile" });
    expect(ports.coachTimePort.release).toHaveBeenCalledWith("reservation-2");
    expect(
      ports.checkInNotificationsPort.newTimeProposed,
    ).not.toHaveBeenCalled();
  });

  it("answers unknown for another client's check-in", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime({
      found: checkIn({ clientId: "client-2" }),
    });

    // act
    const result = await proposeCheckInTimeUseCase.execute({
      ...COACH_PROPOSAL,
      actor: ANA_ACTOR,
    });

    // assert
    expect(result).toEqual({ status: "unknown" });
    expect(ports.checkInsPort.move).not.toHaveBeenCalled();
  });

  it("answers unknown for a check-in that does not exist", async () => {
    // arrange
    const { proposeCheckInTimeUseCase } = createProposeCheckInTime({
      found: null,
    });

    // act
    const result = await proposeCheckInTimeUseCase.execute(COACH_PROPOSAL);

    // assert
    expect(result).toEqual({ status: "unknown" });
  });

  it("refuses a client whose coaching ended", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime({
      client: { ...REACHABLE_ANA, portal: "ended" },
    });

    // act
    const result = await proposeCheckInTimeUseCase.execute({
      ...COACH_PROPOSAL,
      actor: ANA_ACTOR,
    });

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(ports.checkInsPort.move).not.toHaveBeenCalled();
  });

  it("refuses a note longer than 500 characters", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime();

    // act
    const result = await proposeCheckInTimeUseCase.execute({
      ...COACH_PROPOSAL,
      note: "a".repeat(501),
    });

    // assert
    expect(result).toEqual({ status: "note_too_long" });
    expect(ports.checkInsPort.find).not.toHaveBeenCalled();
  });

  it("refuses a client zone that names no place", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime();

    // act
    const result = await proposeCheckInTimeUseCase.execute({
      ...COACH_PROPOSAL,
      actor: ANA_ACTOR,
      clientTimeZone: "+02:00",
    });

    // assert
    expect(result).toEqual({ status: "invalid_time_zone" });
    expect(ports.checkInsPort.move).not.toHaveBeenCalled();
  });

  it("keeps the new time and reports the email the provider refused", async () => {
    // arrange
    const { proposeCheckInTimeUseCase, ports } = createProposeCheckInTime();
    ports.checkInNotificationsPort.newTimeProposed.mockResolvedValue("failed");

    // act
    const result = await proposeCheckInTimeUseCase.execute(COACH_PROPOSAL);

    // assert
    expect(result.status).toBe("proposed");
    expect(
      ports.checkInIncidentsPort.checkInNotificationFailed,
    ).toHaveBeenCalledWith({
      checkInId: "check-in-1",
      notification: "newTimeProposed",
    });
  });
});
