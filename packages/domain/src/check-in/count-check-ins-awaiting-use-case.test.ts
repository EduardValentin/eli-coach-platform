import { describe, expect, it, vi } from "vitest";

import type { ClientReach, ClientReachReading } from "../client";

import { CheckIn, type CheckInProps } from "./check-in";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckIns } from "./check-ins";
import { CountCheckInsAwaitingUseCase } from "./count-check-ins-awaiting-use-case";

const NOW = new Date("2026-06-03T09:30:00.000Z");

const CLIENT_REQUEST = {
  id: "check-in-1",
  clientId: "client-1",
  startsAt: new Date("2026-06-05T09:00:00.000Z"),
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

const COACH_PROPOSAL = {
  ...CLIENT_REQUEST,
  id: "check-in-2",
  initiatedBy: "coach",
  proposedBy: "coach",
} satisfies CheckInProps;

const APPROVED = {
  ...CLIENT_REQUEST,
  id: "check-in-3",
  recordedStatus: "approved",
  answeredAt: new Date("2026-06-02T08:30:00.000Z"),
} satisfies CheckInProps;

const LAPSED_REQUEST = {
  ...CLIENT_REQUEST,
  id: "check-in-4",
  startsAt: new Date("2026-06-03T09:00:00.000Z"),
} satisfies CheckInProps;

const REACHABLE: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  timeZone: "Europe/London",
};

function checkInsOf(...props: CheckInProps[]): CheckIn[] {
  return props.map((entry) => CheckIn.reconstitute(entry));
}

function createUseCase(options: {
  checkIns: CheckIn[];
  client?: ClientReachReading | null;
  failure?: Error;
}) {
  const listed = options.failure
    ? vi.fn().mockRejectedValue(options.failure)
    : vi.fn().mockResolvedValue(options.checkIns);
  const checkIns = {
    find: vi.fn(),
    listAll: listed,
    listForClient: listed,
  } satisfies Pick<CheckIns, "find" | "listAll" | "listForClient">;
  const clients = {
    findByAuthSubjectId: vi
      .fn()
      .mockResolvedValue(
        options.client === undefined ? REACHABLE : options.client,
      ),
  } satisfies Pick<ClientReach, "findByAuthSubjectId">;
  const incidents = {
    checkInNotificationFailed: vi.fn(),
    awaitingCheckInsCountFailed: vi.fn(),
    awaitingCheckInsListFailed: vi.fn(),
    nextCheckInLookupFailed: vi.fn(),
  } satisfies CheckInIncidents;
  const useCase = new CountCheckInsAwaitingUseCase({
    checkIns,
    clients,
    clock: { now: () => NOW },
    incidents,
  });

  return { checkIns, incidents, useCase };
}

describe("CountCheckInsAwaitingUseCase", () => {
  it("counts the coach's check-ins waiting for her answer, leaving out lapsed, answered and her own", async () => {
    // arrange
    const { useCase } = createUseCase({
      checkIns: checkInsOf(
        CLIENT_REQUEST,
        COACH_PROPOSAL,
        APPROVED,
        LAPSED_REQUEST,
      ),
    });

    // act
    const count = await useCase.execute({ party: "coach" });

    // assert
    expect(count).toBe(1);
  });

  it("counts the client's own check-ins waiting for her answer", async () => {
    // arrange
    const { checkIns, useCase } = createUseCase({
      checkIns: checkInsOf(CLIENT_REQUEST, COACH_PROPOSAL, APPROVED),
    });

    // act
    const count = await useCase.execute({
      party: "client",
      authSubjectId: "user_ana",
    });

    // assert
    expect(count).toBe(1);
    expect(checkIns.listForClient).toHaveBeenCalledWith("client-1");
  });

  it("counts nothing for a client whose portal is no longer reachable", async () => {
    // arrange
    const { checkIns, useCase } = createUseCase({
      checkIns: checkInsOf(COACH_PROPOSAL),
      client: { ...REACHABLE, portal: "ended" },
    });

    // act
    const count = await useCase.execute({
      party: "client",
      authSubjectId: "user_ana",
    });

    // assert
    expect(count).toBe(0);
    expect(checkIns.listForClient).not.toHaveBeenCalled();
  });

  it("reports a failed read and counts nothing", async () => {
    // arrange
    const failure = new Error("connection refused");
    const { incidents, useCase } = createUseCase({ checkIns: [], failure });

    // act
    const count = await useCase.execute({ party: "coach" });

    // assert
    expect(count).toBe(0);
    expect(incidents.awaitingCheckInsCountFailed).toHaveBeenCalledWith({
      party: "coach",
      error: failure,
    });
  });
});
