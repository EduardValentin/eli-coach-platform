import { describe, expect, it, vi } from "vitest";

import type { ClientReach, ClientReachReading } from "../client";

import { CheckIn, type CheckInProps } from "./check-in";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckIns } from "./check-ins";
import { FindNextClientCheckInUseCase } from "./find-next-client-check-in-use-case";

const NOW = new Date("2026-06-03T09:30:00.000Z");

const APPROVED = {
  id: "check-in-1",
  seriesId: null,
  clientId: "client-1",
  startsAt: new Date("2026-06-05T09:00:00.000Z"),
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  recordedStatus: "approved",
  initiatedBy: "client",
  proposedBy: "client",
  note: null,
  requestedAt: new Date("2026-06-01T08:30:00.000Z"),
  answeredAt: new Date("2026-06-02T08:30:00.000Z"),
  earlierStartsAt: null,
  moves: 0,
  newTimeNote: null,
} satisfies CheckInProps;

const LATER_APPROVED = {
  ...APPROVED,
  id: "check-in-2",
  startsAt: new Date("2026-06-08T09:00:00.000Z"),
} satisfies CheckInProps;

const SOONER_PENDING = {
  ...APPROVED,
  id: "check-in-3",
  startsAt: new Date("2026-06-04T09:00:00.000Z"),
  recordedStatus: "pending",
  answeredAt: null,
} satisfies CheckInProps;

const SOONER_CANCELLED = {
  ...APPROVED,
  id: "check-in-4",
  startsAt: new Date("2026-06-04T12:00:00.000Z"),
  recordedStatus: "cancelled",
} satisfies CheckInProps;

const LIVE = {
  ...APPROVED,
  id: "check-in-5",
  startsAt: new Date("2026-06-03T09:00:00.000Z"),
} satisfies CheckInProps;

const ENDED = {
  ...APPROVED,
  id: "check-in-6",
  startsAt: new Date("2026-06-03T08:30:00.000Z"),
} satisfies CheckInProps;

const REACHABLE: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: null,
  paidThrough: null,
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
  const checkIns = {
    find: vi.fn(),
    listForClient: options.failure
      ? vi.fn().mockRejectedValue(options.failure)
      : vi.fn().mockResolvedValue(options.checkIns),
  } satisfies Pick<CheckIns, "find" | "listForClient">;
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
    checkInSeriesNotificationFailed: vi.fn(),
    checkInSeriesExtensionFailed: vi.fn(),
    checkInSeriesReadFailed: vi.fn(),
    checkInInboxFailed: vi.fn(),
    checkInSeriesInboxFailed: vi.fn(),
  } satisfies CheckInIncidents;
  const useCase = new FindNextClientCheckInUseCase({
    checkIns,
    clients,
    clock: { now: () => NOW },
    incidents,
  });

  return { checkIns, incidents, useCase };
}

describe("FindNextClientCheckInUseCase", () => {
  it("finds her soonest approved check-in, viewed for her", async () => {
    // arrange
    const [later, soonest, pending, cancelled] = checkInsOf(
      LATER_APPROVED,
      APPROVED,
      SOONER_CANCELLED,
      SOONER_PENDING,
    );
    const { checkIns, useCase } = createUseCase({
      checkIns: [later, soonest, pending, cancelled],
    });

    // act
    const next = await useCase.execute("user_ana");

    // assert
    expect(next).toEqual(soonest.viewFor({ party: "client", at: NOW }));
    expect(checkIns.listForClient).toHaveBeenCalledWith("client-1");
  });

  it("still finds an approved check-in that is live now", async () => {
    // arrange
    const { useCase } = createUseCase({
      checkIns: checkInsOf(APPROVED, LIVE),
    });

    // act
    const next = await useCase.execute("user_ana");

    // assert
    expect(next).toMatchObject({ id: "check-in-5", status: "approved" });
  });

  it("passes over an approved check-in that has ended", async () => {
    // arrange
    const { useCase } = createUseCase({
      checkIns: checkInsOf(APPROVED, ENDED),
    });

    // act
    const next = await useCase.execute("user_ana");

    // assert
    expect(next).toMatchObject({ id: "check-in-1" });
  });

  it("finds nothing when none of her check-ins is approved and still ahead", async () => {
    // arrange
    const { useCase } = createUseCase({
      checkIns: checkInsOf(SOONER_PENDING, SOONER_CANCELLED, ENDED),
    });

    // act
    const next = await useCase.execute("user_ana");

    // assert
    expect(next).toBeNull();
  });

  it.each([
    ["whose coaching ended", { ...REACHABLE, portal: "ended" }],
    ["with no client record", null],
  ] as const)("finds nothing for a client %s", async (_situation, client) => {
    // arrange
    const { checkIns, useCase } = createUseCase({
      checkIns: checkInsOf(APPROVED),
      client,
    });

    // act
    const next = await useCase.execute("user_ana");

    // assert
    expect(next).toBeNull();
    expect(checkIns.listForClient).not.toHaveBeenCalled();
  });

  it("reports a failed read and finds nothing", async () => {
    // arrange
    const failure = new Error("connection refused");
    const { incidents, useCase } = createUseCase({ checkIns: [], failure });

    // act
    const next = await useCase.execute("user_ana");

    // assert
    expect(next).toBeNull();
    expect(incidents.nextCheckInLookupFailed).toHaveBeenCalledWith({
      error: failure,
    });
  });
});
