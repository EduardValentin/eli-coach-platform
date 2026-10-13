import { describe, expect, it, vi } from "vitest";

import type { ClientIdentities, ClientIdentity } from "../client";

import { CheckIn, type CheckInProps } from "./check-in";
import type { CheckIns } from "./check-ins";
import { CoachCheckInViews } from "./coach-check-in-views";

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

function checkIn(props?: Partial<CheckInProps>): CheckIn {
  return CheckIn.reconstitute({ ...REQUEST, ...props });
}

function createViews(options: {
  checkIns: CheckIn[];
  identities: ClientIdentity[];
}) {
  const checkIns = {
    listAll: vi.fn().mockResolvedValue(options.checkIns),
  } satisfies Pick<CheckIns, "listAll">;
  const identities = {
    findByClientIds: vi.fn().mockResolvedValue(options.identities),
  } satisfies Pick<ClientIdentities, "findByClientIds">;
  const views = new CoachCheckInViews({
    checkIns,
    clock: { now: () => NOW },
    identities,
  });

  return { identities, views };
}

describe("CoachCheckInViews", () => {
  it("views every client's check-in for the coach now with her name, soonest start first", async () => {
    // arrange
    const later = checkIn({
      id: "check-in-2",
      clientId: "client-2",
      startsAt: new Date("2026-06-06T09:00:00.000Z"),
    });
    const sooner = checkIn({ id: "check-in-1" });
    const { views } = createViews({
      checkIns: [later, sooner],
      identities: [MARIA, ANA],
    });

    // act
    const listed = await views.list();

    // assert
    expect(listed).toEqual([
      {
        ...sooner.viewFor({ party: "coach", at: NOW }),
        client: { firstName: "Ana", lastName: "Popescu" },
      },
      {
        ...later.viewFor({ party: "coach", at: NOW }),
        client: { firstName: "Maria", lastName: "Ionescu" },
      },
    ]);
  });

  it("reads the names of every distinct client in one read", async () => {
    // arrange
    const { identities, views } = createViews({
      checkIns: [
        checkIn(),
        checkIn({ id: "check-in-2" }),
        checkIn({ id: "check-in-3", clientId: "client-2" }),
      ],
      identities: [ANA, MARIA],
    });

    // act
    await views.list();

    // assert
    expect(identities.findByClientIds).toHaveBeenCalledTimes(1);
    expect(identities.findByClientIds).toHaveBeenCalledWith([
      "client-1",
      "client-2",
    ]);
  });

  it("leaves out a check-in whose client has no identity", async () => {
    // arrange
    const { views } = createViews({
      checkIns: [checkIn({ id: "check-in-2", clientId: "gone" }), checkIn()],
      identities: [ANA],
    });

    // act
    const listed = await views.list();

    // assert
    expect(listed.map((view) => view.id)).toEqual(["check-in-1"]);
  });
});
