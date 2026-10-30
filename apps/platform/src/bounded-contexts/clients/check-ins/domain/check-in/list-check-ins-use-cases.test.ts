import { describe, expect, it, vi } from "vitest";

import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "./client-identities-port";
import type { ClientReachPort, ClientReachReading } from "./client-reach-port";

import { CheckIn, type CheckInProps } from "./check-in";
import type { CheckInsPort } from "./check-ins-port";
import { ListClientCheckInsUseCase } from "./list-client-check-ins-use-case";
import { ListCoachCheckInsUseCase } from "./list-coach-check-ins-use-case";

const NOW = new Date("2026-06-03T09:30:00.000Z");

const ANA: ClientIdentity = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: "+40712345678",
};

const MARIA: ClientIdentity = {
  clientId: "client-2",
  firstName: "Maria",
  lastName: "Ionescu",
  email: "maria@example.com",
  dateOfBirth: "1991-07-02",
  gender: "female",
  country: "RO",
  phone: null,
};

const REQUEST = {
  id: "check-in-1",
  seriesId: null,
  clientId: "client-1",
  startsAt: new Date("2026-06-03T09:00:00.000Z"),
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
  return CheckIn.reconstitute({ ...REQUEST, ...props });
}

function weekOf(week: number, props?: Partial<CheckInProps>): CheckIn {
  return checkIn({
    id: `week-${week}`,
    seriesId: "series-1",
    kind: "recurring",
    recordedStatus: "approved",
    initiatedBy: "coach",
    proposedBy: "coach",
    startsAt: new Date(Date.UTC(2026, 5, 4 + 7 * week, 15)),
    ...props,
  });
}

function createPorts(options: {
  checkIns: CheckIn[];
  client?: ClientReachReading | null;
  identities?: ClientIdentity[];
}) {
  const checkIns = {
    listForClientLocked: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(undefined),
    find: vi.fn(),
    listForClient: vi.fn().mockResolvedValue(options.checkIns),
    listAll: vi.fn().mockResolvedValue(options.checkIns),
    settle: vi.fn(),
    move: vi.fn(),
    endCoaching: vi.fn(),
  } satisfies CheckInsPort;
  const clients = {
    findByAuthSubjectId: vi.fn().mockResolvedValue(
      options.client === undefined
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
    findByClientIds: vi.fn().mockResolvedValue(options.identities ?? []),
  } satisfies Pick<ClientIdentitiesPort, "findByClientIds">;

  return { checkIns, clients, clock: { now: () => NOW }, identities };
}

describe("ListClientCheckInsUseCase", () => {
  it("lists only her check-ins with each status at the clock's instant", async () => {
    // arrange
    const unanswered = checkIn();
    const approved = checkIn({
      id: "check-in-2",
      recordedStatus: "approved",
      startsAt: new Date("2026-06-05T09:00:00.000Z"),
    });
    const ports = createPorts({ checkIns: [unanswered, approved] });

    // act
    const result = await new ListClientCheckInsUseCase(ports).execute(
      "user_ana",
    );

    // assert
    expect(result).toEqual({
      status: "listed",
      checkIns: [
        {
          ...unanswered.toSnapshot(),
          status: "cancelled",
          tab: "past",
          awaitsViewer: false,
          viewerMayWithdraw: false,
          isWaitingRequest: false,
          viewerProposal: "none",
          viewerMayCancel: false,
          newTimeWaits: false,
        },
        {
          ...approved.toSnapshot(),
          status: "approved",
          tab: "upcoming",
          awaitsViewer: false,
          viewerMayWithdraw: false,
          isWaitingRequest: false,
          viewerProposal: "allowed",
          viewerMayCancel: true,
          newTimeWaits: false,
        },
      ],
    });
    expect(ports.checkIns.listForClient).toHaveBeenCalledWith("client-1");
  });

  it("shows her waiting request as hers to withdraw, not hers to answer", async () => {
    // arrange
    const waiting = checkIn({ startsAt: new Date("2026-06-05T09:00:00.000Z") });
    const ports = createPorts({ checkIns: [waiting] });

    // act
    const result = await new ListClientCheckInsUseCase(ports).execute(
      "user_ana",
    );

    // assert
    expect(result).toMatchObject({
      checkIns: [
        {
          status: "pending",
          awaitsViewer: false,
          viewerMayWithdraw: true,
          isWaitingRequest: true,
        },
      ],
    });
  });

  it.each([
    [
      "whose coaching ended",
      {
        clientId: "client-1",
        portal: "ended",
        coachingEndsAt: null,
        programStartsAt: null,
        paidThrough: null,
        timeZone: "Europe/London",
      },
    ],
    ["with no client record", null],
  ] as const)("refuses a requester %s", async (_situation, client) => {
    // arrange
    const ports = createPorts({ checkIns: [], client });

    // act
    const result = await new ListClientCheckInsUseCase(ports).execute(
      "user_ana",
    );

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(ports.checkIns.listForClient).not.toHaveBeenCalled();
  });
});

describe("ListClientCheckInsUseCase weekly check-ins", () => {
  it("lists every weekly check-in to come and holds back moving every week after her next one", async () => {
    // arrange
    const ports = createPorts({
      checkIns: [
        weekOf(2),
        weekOf(0, { recordedStatus: "clash" }),
        weekOf(1),
        weekOf(-1, { recordedStatus: "cancelled" }),
      ],
    });

    // act
    const result = await new ListClientCheckInsUseCase(ports).execute(
      "user_ana",
    );

    // assert
    expect(
      result.status === "listed" &&
        result.checkIns.map(({ id, viewerProposal }) => ({
          id,
          viewerProposal,
        })),
    ).toEqual([
      { id: "week-2", viewerProposal: "later_week" },
      { id: "week-0", viewerProposal: "none" },
      { id: "week-1", viewerProposal: "later_week" },
      { id: "week--1", viewerProposal: "none" },
    ]);
  });
});

describe("ListCoachCheckInsUseCase", () => {
  it("lists every client's check-ins with her name and the status now", async () => {
    // arrange
    const anas = checkIn();
    const marias = checkIn({
      id: "check-in-2",
      clientId: "client-2",
      recordedStatus: "approved",
      startsAt: new Date("2026-06-03T09:00:00.000Z"),
    });
    const ports = createPorts({
      checkIns: [anas, marias],
      identities: [MARIA, ANA],
    });

    // act
    const listed = await new ListCoachCheckInsUseCase(ports).execute();

    // assert
    expect(listed).toEqual([
      {
        ...anas.toSnapshot(),
        status: "cancelled",
        tab: "past",
        awaitsViewer: false,
        viewerMayWithdraw: false,
        isWaitingRequest: false,
        viewerProposal: "none",
        viewerMayCancel: false,
        newTimeWaits: false,
        client: { firstName: "Ana", lastName: "Popescu" },
      },
      {
        ...marias.toSnapshot(),
        status: "approved",
        tab: "upcoming",
        awaitsViewer: false,
        viewerMayWithdraw: false,
        isWaitingRequest: false,
        viewerProposal: "none",
        viewerMayCancel: false,
        newTimeWaits: false,
        client: { firstName: "Maria", lastName: "Ionescu" },
      },
    ]);
  });

  it("shows a client's waiting request as the coach's to answer, not hers to withdraw", async () => {
    // arrange
    const waiting = checkIn({ startsAt: new Date("2026-06-05T09:00:00.000Z") });
    const ports = createPorts({ checkIns: [waiting], identities: [ANA] });

    // act
    const listed = await new ListCoachCheckInsUseCase(ports).execute();

    // assert
    expect(listed).toMatchObject([
      {
        status: "pending",
        awaitsViewer: true,
        viewerMayWithdraw: false,
        isWaitingRequest: true,
      },
    ]);
  });

  it("reads every client's name in one read", async () => {
    // arrange
    const ports = createPorts({
      checkIns: [
        checkIn(),
        checkIn({ id: "check-in-2" }),
        checkIn({ id: "check-in-3", clientId: "client-2" }),
      ],
      identities: [ANA, MARIA],
    });

    // act
    await new ListCoachCheckInsUseCase(ports).execute();

    // assert
    expect(ports.identities.findByClientIds).toHaveBeenCalledTimes(1);
    expect(ports.identities.findByClientIds).toHaveBeenCalledWith([
      "client-1",
      "client-2",
    ]);
  });

  it("leaves out a check-in whose client no longer exists", async () => {
    // arrange
    const ports = createPorts({
      checkIns: [checkIn(), checkIn({ id: "check-in-2", clientId: "gone" })],
      identities: [ANA],
    });

    // act
    const listed = await new ListCoachCheckInsUseCase(ports).execute();

    // assert
    expect(listed.map((listing) => listing.id)).toEqual(["check-in-1"]);
  });
});

describe("ListCoachCheckInsUseCase weekly check-ins", () => {
  it("lists a clash under Requests and every approved week of the series under Upcoming", async () => {
    // arrange
    const ports = createPorts({
      checkIns: [
        weekOf(0, { recordedStatus: "clash" }),
        weekOf(1),
        weekOf(2),
        weekOf(3, { recordedStatus: "pending", proposedBy: "client" }),
      ],
      identities: [ANA],
    });

    // act
    const listed = await new ListCoachCheckInsUseCase(ports).execute();

    // assert
    expect(listed.map((view) => [view.id, view.tab])).toEqual([
      ["week-0", "requests"],
      ["week-1", "upcoming"],
      ["week-2", "upcoming"],
      ["week-3", "requests"],
    ]);
  });
});
