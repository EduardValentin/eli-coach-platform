import { describe, expect, it, vi } from "vitest";

import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "./client-identities-port";

import { CheckIn, type CheckInProps } from "./check-in";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInsPort } from "./check-ins-port";
import { ListCoachCheckInsAwaitingUseCase } from "./list-coach-check-ins-awaiting-use-case";

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

const CLIENT_REQUEST = {
  id: "check-in-1",
  seriesId: null,
  clientId: "client-1",
  startsAt: new Date("2026-06-06T09:00:00.000Z"),
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

const SOONER_CLIENT_REQUEST = {
  ...CLIENT_REQUEST,
  id: "check-in-2",
  clientId: "client-2",
  startsAt: new Date("2026-06-04T09:00:00.000Z"),
} satisfies CheckInProps;

const WAITING_FOR_CLIENT = {
  ...CLIENT_REQUEST,
  id: "check-in-3",
  startsAt: new Date("2026-06-05T09:00:00.000Z"),
  initiatedBy: "coach",
  proposedBy: "coach",
} satisfies CheckInProps;

const APPROVED = {
  ...CLIENT_REQUEST,
  id: "check-in-4",
  startsAt: new Date("2026-06-04T12:00:00.000Z"),
  recordedStatus: "approved",
  answeredAt: new Date("2026-06-02T08:30:00.000Z"),
} satisfies CheckInProps;

const EXPIRED_REQUEST = {
  ...CLIENT_REQUEST,
  id: "check-in-5",
  startsAt: new Date("2026-06-03T09:00:00.000Z"),
} satisfies CheckInProps;

const CLASH = {
  ...CLIENT_REQUEST,
  id: "check-in-6",
  seriesId: "series-1",
  kind: "recurring",
  recordedStatus: "clash",
  initiatedBy: "coach",
  proposedBy: "coach",
  startsAt: new Date("2026-06-06T09:00:00.000Z"),
} satisfies CheckInProps;

function checkInsOf(...props: CheckInProps[]): CheckIn[] {
  return props.map((entry) => CheckIn.reconstitute(entry));
}

function createUseCase(options: {
  checkIns: CheckIn[];
  listFailure?: Error;
  identityFailure?: Error;
}) {
  const checkIns = {
    listAll: options.listFailure
      ? vi.fn().mockRejectedValue(options.listFailure)
      : vi.fn().mockResolvedValue(options.checkIns),
  } satisfies Pick<CheckInsPort, "listAll">;
  const identities = {
    findByClientIds: options.identityFailure
      ? vi.fn().mockRejectedValue(options.identityFailure)
      : vi.fn().mockResolvedValue([ANA, MARIA]),
  } satisfies Pick<ClientIdentitiesPort, "findByClientIds">;
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
  } satisfies CheckInIncidentsPort;
  const useCase = new ListCoachCheckInsAwaitingUseCase({
    checkIns,
    clock: { now: () => NOW },
    identities,
    incidents,
  });

  return { incidents, useCase };
}

describe("ListCoachCheckInsAwaitingUseCase", () => {
  it("lists the check-ins waiting for the coach's answer with each client's name, soonest start first", async () => {
    // arrange
    const { useCase } = createUseCase({
      checkIns: checkInsOf(CLIENT_REQUEST, SOONER_CLIENT_REQUEST),
    });

    // act
    const listed = await useCase.execute();

    // assert
    expect(listed).toMatchObject([
      {
        id: "check-in-2",
        awaitsViewer: true,
        client: { firstName: "Maria", lastName: "Ionescu" },
      },
      {
        id: "check-in-1",
        awaitsViewer: true,
        client: { firstName: "Ana", lastName: "Popescu" },
      },
    ]);
  });

  it("lists a clash as waiting for the coach to find a new time", async () => {
    // arrange
    const { useCase } = createUseCase({
      checkIns: checkInsOf(CLASH, CLIENT_REQUEST),
    });

    // act
    const listed = await useCase.execute();

    // assert
    expect(listed.map((view) => [view.id, view.status])).toEqual([
      ["check-in-6", "clash"],
      ["check-in-1", "pending"],
    ]);
  });

  it.each([
    ["one waiting for the client", WAITING_FOR_CLIENT],
    ["an approved one", APPROVED],
    ["a request whose start has passed", EXPIRED_REQUEST],
  ])("leaves out %s", async (_situation, props) => {
    // arrange
    const { useCase } = createUseCase({
      checkIns: checkInsOf(CLIENT_REQUEST, props),
    });

    // act
    const listed = await useCase.execute();

    // assert
    expect(listed.map((view) => view.id)).toEqual(["check-in-1"]);
  });

  it.each([
    ["check-ins", "listFailure"],
    ["client names", "identityFailure"],
  ] as const)(
    "reports a failed read of the %s and lists nothing",
    async (_read, failing) => {
      // arrange
      const failure = new Error("connection refused");
      const { incidents, useCase } = createUseCase({
        checkIns: checkInsOf(CLIENT_REQUEST),
        [failing]: failure,
      });

      // act
      const listed = await useCase.execute();

      // assert
      expect(listed).toEqual([]);
      expect(incidents.awaitingCheckInsListFailed).toHaveBeenCalledWith({
        error: failure,
      });
    },
  );
});
