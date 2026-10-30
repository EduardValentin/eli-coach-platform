import { describe, expect, it, vi } from "vitest";

import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "./client-identities-port";

import { CheckIn, type CheckInProps } from "./check-in";
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
  seriesId: null,
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
  const identities = {
    findByClientIds: vi.fn().mockResolvedValue(options.identities),
  } satisfies Pick<ClientIdentitiesPort, "findByClientIds">;
  const views = new CoachCheckInViews({
    clockPort: { now: () => NOW },
    clientIdentitiesPort: identities,
  });

  return { checkIns: options.checkIns, identities, views };
}

describe("CoachCheckInViews#viewsOf", () => {
  it("views every client's check-in for the coach now with her name, soonest start first", async () => {
    // arrange
    const later = checkIn({
      id: "check-in-2",
      clientId: "client-2",
      startsAt: new Date("2026-06-06T09:00:00.000Z"),
    });
    const sooner = checkIn({ id: "check-in-1" });
    const { checkIns, views } = createViews({
      checkIns: [later, sooner],
      identities: [MARIA, ANA],
    });

    // act
    const listed = await views.viewsOf(checkIns);

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
    const { checkIns, identities, views } = createViews({
      checkIns: [
        checkIn(),
        checkIn({ id: "check-in-2" }),
        checkIn({ id: "check-in-3", clientId: "client-2" }),
      ],
      identities: [ANA, MARIA],
    });

    // act
    await views.viewsOf(checkIns);

    // assert
    expect(identities.findByClientIds).toHaveBeenCalledTimes(1);
    expect(identities.findByClientIds).toHaveBeenCalledWith([
      "client-1",
      "client-2",
    ]);
  });

  it("leaves out a check-in whose client has no identity", async () => {
    // arrange
    const { checkIns, views } = createViews({
      checkIns: [checkIn({ id: "check-in-2", clientId: "gone" }), checkIn()],
      identities: [ANA],
    });

    // act
    const listed = await views.viewsOf(checkIns);

    // assert
    expect(listed.map((view) => view.id)).toEqual(["check-in-1"]);
  });
});
