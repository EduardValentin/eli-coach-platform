import { describe, expect, it, vi } from "vitest";

import { CheckIn, type CheckInProps } from "./check-in";
import type {
  CheckInClient,
  CheckInClientIdentity,
  CheckInClients,
} from "./check-in-clients";
import type { CheckIns } from "./check-ins";
import { ListClientCheckInsUseCase } from "./list-client-check-ins-use-case";
import { ListCoachCheckInsUseCase } from "./list-coach-check-ins-use-case";

const NOW = new Date("2026-06-03T09:30:00.000Z");

const ANA: CheckInClientIdentity = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
};

const MARIA: CheckInClientIdentity = {
  clientId: "client-2",
  firstName: "Maria",
  lastName: "Ionescu",
  email: "maria@example.com",
};

const REQUEST = {
  id: "check-in-1",
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
} satisfies CheckInProps;

function checkIn(props?: Partial<CheckInProps>): CheckIn {
  return CheckIn.reconstitute({ ...REQUEST, ...props });
}

function createPorts(options: {
  checkIns: CheckIn[];
  client?: CheckInClient | null;
  identities?: CheckInClientIdentity[];
}) {
  const checkIns = {
    request: vi.fn(),
    find: vi.fn(),
    listForClient: vi.fn().mockResolvedValue(options.checkIns),
    listAll: vi.fn().mockResolvedValue(options.checkIns),
    settle: vi.fn(),
  } satisfies CheckIns;
  const clients = {
    findByAuthSubjectId: vi
      .fn()
      .mockResolvedValue(
        options.client === undefined
          ? { clientId: "client-1", portal: "reachable" }
          : options.client,
      ),
    identitiesOf: vi.fn().mockResolvedValue(options.identities ?? []),
  } satisfies CheckInClients;

  return { checkIns, clients, clock: { now: () => NOW } };
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
          awaitsViewer: false,
          viewerMayWithdraw: false,
          isWaitingRequest: false,
        },
        {
          ...approved.toSnapshot(),
          status: "approved",
          awaitsViewer: false,
          viewerMayWithdraw: false,
          isWaitingRequest: false,
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
    ["whose coaching ended", { clientId: "client-1", portal: "unreachable" }],
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
        awaitsViewer: false,
        viewerMayWithdraw: false,
        isWaitingRequest: false,
        client: { firstName: "Ana", lastName: "Popescu" },
      },
      {
        ...marias.toSnapshot(),
        status: "approved",
        awaitsViewer: false,
        viewerMayWithdraw: false,
        isWaitingRequest: false,
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
    expect(ports.clients.identitiesOf).toHaveBeenCalledTimes(1);
    expect(ports.clients.identitiesOf).toHaveBeenCalledWith([
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
