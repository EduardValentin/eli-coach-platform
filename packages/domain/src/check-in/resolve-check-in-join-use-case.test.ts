import { describe, expect, it, vi } from "vitest";

import {
  CoachMeetingRoom,
  type CoachMeetingRoomSource,
} from "../coach-meeting-room";

import { CheckIn, type CheckInProps } from "./check-in";
import type { CheckInClient, CheckInClients } from "./check-in-clients";
import type { CheckIns } from "./check-ins";
import {
  ResolveCheckInJoinUseCase,
  type CheckInRequester,
} from "./resolve-check-in-join-use-case";

const NOW = new Date("2026-06-03T08:55:00.000Z");
const ROOM_URL = "https://meet.google.com/abc-defg-hij";

const APPROVED = {
  id: "check-in-1",
  clientId: "client-1",
  startsAt: new Date("2026-06-03T09:00:00.000Z"),
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  recordedStatus: "approved",
  initiatedBy: "client",
  proposedBy: "client",
  note: null,
  requestedAt: new Date("2026-06-01T08:30:00.000Z"),
  answeredAt: new Date("2026-06-01T12:00:00.000Z"),
} satisfies CheckInProps;

const ANA: CheckInRequester = { party: "client", authSubjectId: "user_ana" };
const COACH: CheckInRequester = { party: "coach" };

function checkIn(props?: Partial<CheckInProps>): CheckIn {
  return CheckIn.reconstitute({ ...APPROVED, ...props });
}

function roomAt(url: string): CoachMeetingRoom {
  const result = CoachMeetingRoom.from(url);

  if (result.status !== "set") {
    throw new Error(`expected a valid meeting room, got ${result.status}`);
  }

  return result.room;
}

function createResolveJoin(options?: {
  found?: CheckIn | null;
  room?: CoachMeetingRoom | null;
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
    listForClient: vi.fn(),
    listAll: vi.fn(),
    settle: vi.fn(),
  } satisfies CheckIns;
  const clients = {
    findByAuthSubjectId: vi
      .fn()
      .mockResolvedValue(
        options?.client === undefined
          ? { clientId: "client-1", portal: "reachable" }
          : options.client,
      ),
    identitiesOf: vi.fn(),
  } satisfies CheckInClients;
  const meetingRoom: CoachMeetingRoomSource = {
    current: vi
      .fn()
      .mockResolvedValue(
        options?.room === undefined ? roomAt(ROOM_URL) : options.room,
      ),
  };
  const now = options?.now ?? NOW;

  return new ResolveCheckInJoinUseCase({
    checkIns,
    clients,
    clock: { now: () => now },
    meetingRoom,
  });
}

describe("ResolveCheckInJoinUseCase", () => {
  it.each([
    ["the client whose check-in it is", ANA],
    ["the coach", COACH],
  ])("sends %s to the coach's meeting room", async (_situation, requester) => {
    // arrange
    const resolveJoin = createResolveJoin();

    // act
    const result = await resolveJoin.execute({
      requester,
      checkInId: "check-in-1",
    });

    // assert
    expect(result).toEqual({ status: "found", url: ROOM_URL });
  });

  it("lets the coach join any client's check-in", async () => {
    // arrange
    const resolveJoin = createResolveJoin({
      found: checkIn({ clientId: "client-2" }),
    });

    // act
    const result = await resolveJoin.execute({
      requester: COACH,
      checkInId: "check-in-1",
    });

    // assert
    expect(result).toEqual({ status: "found", url: ROOM_URL });
  });

  it("answers link not set while the coach has no meeting room", async () => {
    // arrange
    const resolveJoin = createResolveJoin({ room: null });

    // act
    const result = await resolveJoin.execute({
      requester: ANA,
      checkInId: "check-in-1",
    });

    // assert
    expect(result).toEqual({ status: "link_not_set" });
  });

  it.each([
    ["another client's check-in", { found: checkIn({ clientId: "client-2" }) }],
    [
      "a pending request",
      { found: checkIn({ recordedStatus: "pending", answeredAt: null }) },
    ],
    [
      "a cancelled check-in",
      { found: checkIn({ recordedStatus: "cancelled" }) },
    ],
    [
      "a check-in that has passed",
      { now: new Date("2026-06-03T10:00:00.000Z") },
    ],
    ["a check-in that does not exist", { found: null }],
    [
      "a client whose coaching ended",
      { client: { clientId: "client-1", portal: "unreachable" } as const },
    ],
  ])("answers unknown to the client for %s", async (_situation, options) => {
    // arrange
    const resolveJoin = createResolveJoin(options);

    // act
    const result = await resolveJoin.execute({
      requester: ANA,
      checkInId: "check-in-1",
    });

    // assert
    expect(result).toEqual({ status: "unknown" });
  });

  it.each([
    [
      "a pending request",
      { found: checkIn({ recordedStatus: "pending", answeredAt: null }) },
    ],
    [
      "a cancelled check-in",
      { found: checkIn({ recordedStatus: "cancelled" }) },
    ],
    [
      "a check-in that has passed",
      { now: new Date("2026-06-03T10:00:00.000Z") },
    ],
  ])("answers unknown to the coach for %s", async (_situation, options) => {
    // arrange
    const resolveJoin = createResolveJoin(options);

    // act
    const result = await resolveJoin.execute({
      requester: COACH,
      checkInId: "check-in-1",
    });

    // assert
    expect(result).toEqual({ status: "unknown" });
  });
});
