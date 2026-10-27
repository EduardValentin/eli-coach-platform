import { describe, expect, it, vi } from "vitest";

import type { ClientIdentities } from "~/bounded-contexts/clients/clients/domain/client";

import { CheckIn, type CheckInProps } from "./check-in";
import type { CheckIns } from "./check-ins";
import { ListLapsedCheckInsUseCase } from "./list-lapsed-check-ins-use-case";

const NOW = new Date("2026-10-15T09:00:00.000Z");
const SINCE = new Date("2026-07-17T09:00:00.000Z");

const ANA = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
};

const MARA = {
  clientId: "client-2",
  firstName: "Mara",
  lastName: "Ionescu",
  email: "mara@example.com",
};

const REQUEST: CheckInProps = {
  id: "check-in-1",
  seriesId: null,
  clientId: "client-1",
  startsAt: new Date("2026-10-14T15:00:00.000Z"),
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  recordedStatus: "pending",
  initiatedBy: "client",
  proposedBy: "client",
  note: null,
  requestedAt: new Date("2026-10-12T09:00:00.000Z"),
  answeredAt: null,
  earlierStartsAt: null,
  moves: 0,
  newTimeNote: null,
};

function checkIn(props?: Partial<CheckInProps>): CheckIn {
  return CheckIn.reconstitute({ ...REQUEST, ...props });
}

const EXPIRED_REQUEST = checkIn();
const EXPIRED_NEW_TIME = checkIn({
  id: "check-in-2",
  clientId: "client-2",
  startsAt: new Date("2026-10-13T15:00:00.000Z"),
  proposedBy: "coach",
  earlierStartsAt: new Date("2026-10-12T15:00:00.000Z"),
  moves: 1,
});
const MISSED_CLASH = checkIn({
  id: "check-in-3",
  seriesId: "series-1",
  kind: "recurring",
  recordedStatus: "clash",
  initiatedBy: "coach",
  proposedBy: "coach",
  startsAt: new Date("2026-10-08T15:00:00.000Z"),
});
const WAITING_REQUEST = checkIn({
  id: "check-in-4",
  startsAt: new Date("2026-10-20T15:00:00.000Z"),
});
const TOOK_PLACE = checkIn({
  id: "check-in-5",
  recordedStatus: "approved",
  answeredAt: new Date("2026-10-12T10:00:00.000Z"),
});
const CANCELLED_AT_COACHING_END = checkIn({
  id: "check-in-6",
  recordedStatus: "cancelled",
});
const EXPIRED_LONG_AGO = checkIn({
  id: "check-in-7",
  startsAt: new Date("2026-07-01T15:00:00.000Z"),
});

function createListLapsed(listed: CheckIn[]) {
  const checkIns = {
    listUnansweredStartedWithin: vi.fn().mockResolvedValue(listed),
    listUnansweredForClientStartedWithin: vi.fn().mockResolvedValue(listed),
  } satisfies Pick<
    CheckIns,
    "listUnansweredStartedWithin" | "listUnansweredForClientStartedWithin"
  >;
  const identities = {
    findByClientIds: vi.fn().mockResolvedValue([ANA, MARA]),
  } satisfies Pick<ClientIdentities, "findByClientIds">;
  const ports = { checkIns, identities };

  return { listLapsed: new ListLapsedCheckInsUseCase(ports), ports };
}

describe("ListLapsedCheckInsUseCase", () => {
  it("lists every client's lapsed check-ins once for the coach from the unanswered ones of the window, named by one identity read", async () => {
    // arrange
    const { listLapsed, ports } = createListLapsed([
      EXPIRED_REQUEST,
      EXPIRED_NEW_TIME,
      MISSED_CLASH,
    ]);

    // act
    const lapsed = await listLapsed.execute({
      party: "coach",
      clientId: null,
      since: SINCE,
      at: NOW,
    });

    // assert
    expect(lapsed).toEqual([
      {
        checkIn: EXPIRED_REQUEST.toSnapshot(),
        lapse: { kind: "request_expired", lapsedAt: EXPIRED_REQUEST.startsAt },
        party: "coach",
        client: ANA,
      },
      {
        checkIn: EXPIRED_NEW_TIME.toSnapshot(),
        lapse: {
          kind: "new_time_expired",
          lapsedAt: EXPIRED_NEW_TIME.startsAt,
        },
        party: "coach",
        client: MARA,
      },
      {
        checkIn: MISSED_CLASH.toSnapshot(),
        lapse: { kind: "clash_missed", lapsedAt: MISSED_CLASH.startsAt },
        party: "coach",
        client: ANA,
      },
    ]);
    expect(ports.checkIns.listUnansweredStartedWithin).toHaveBeenCalledWith({
      since: SINCE,
      at: NOW,
    });
    expect(
      ports.checkIns.listUnansweredForClientStartedWithin,
    ).not.toHaveBeenCalled();
    expect(ports.identities.findByClientIds).toHaveBeenCalledOnce();
    expect(ports.identities.findByClientIds).toHaveBeenCalledWith([
      "client-1",
      "client-2",
    ]);
  });

  it("lists only her own lapsed check-ins for a client from her unanswered ones of the window", async () => {
    // arrange
    const { listLapsed, ports } = createListLapsed([EXPIRED_REQUEST]);

    // act
    const lapsed = await listLapsed.execute({
      party: "client",
      clientId: "client-1",
      since: SINCE,
      at: NOW,
    });

    // assert
    expect(lapsed).toEqual([
      {
        checkIn: EXPIRED_REQUEST.toSnapshot(),
        lapse: { kind: "request_expired", lapsedAt: EXPIRED_REQUEST.startsAt },
        party: "client",
        client: ANA,
      },
    ]);
    expect(
      ports.checkIns.listUnansweredForClientStartedWithin,
    ).toHaveBeenCalledWith("client-1", { since: SINCE, at: NOW });
    expect(ports.checkIns.listUnansweredStartedWithin).not.toHaveBeenCalled();
  });

  it("leaves out check-ins that did not lapse and lapses before the window", async () => {
    // arrange
    const { listLapsed } = createListLapsed([
      WAITING_REQUEST,
      TOOK_PLACE,
      CANCELLED_AT_COACHING_END,
      EXPIRED_LONG_AGO,
      EXPIRED_REQUEST,
    ]);

    // act
    const lapsed = await listLapsed.execute({
      party: "coach",
      clientId: null,
      since: SINCE,
      at: NOW,
    });

    // assert
    expect(lapsed.map((item) => item.checkIn.id)).toEqual(["check-in-1"]);
  });

  it("keeps a lapse at the very start of the window", async () => {
    // arrange
    const { listLapsed } = createListLapsed([
      checkIn({ id: "check-in-8", startsAt: SINCE }),
    ]);

    // act
    const lapsed = await listLapsed.execute({
      party: "coach",
      clientId: null,
      since: SINCE,
      at: NOW,
    });

    // assert
    expect(lapsed.map(({ lapse }) => lapse.lapsedAt)).toEqual([SINCE]);
  });

  it("reads no identity when nothing lapsed", async () => {
    // arrange
    const { listLapsed, ports } = createListLapsed([WAITING_REQUEST]);

    // act
    const lapsed = await listLapsed.execute({
      party: "coach",
      clientId: null,
      since: SINCE,
      at: NOW,
    });

    // assert
    expect(lapsed).toEqual([]);
    expect(ports.identities.findByClientIds).not.toHaveBeenCalled();
  });

  it("leaves out a lapse whose client can no longer be named", async () => {
    // arrange
    const { listLapsed, ports } = createListLapsed([
      EXPIRED_REQUEST,
      EXPIRED_NEW_TIME,
    ]);
    ports.identities.findByClientIds.mockResolvedValue([MARA]);

    // act
    const lapsed = await listLapsed.execute({
      party: "coach",
      clientId: null,
      since: SINCE,
      at: NOW,
    });

    // assert
    expect(lapsed.map((item) => item.checkIn.id)).toEqual(["check-in-2"]);
  });
});
