import { describe, expect, it, vi } from "vitest";

import { VisitorCountries } from "../assessment-call";

import type { ClientIdentities, ClientIdentity } from "./client-identities";
import type { ClientIdentityChanges } from "./client-identity-changes";
import type { ClientReach, ClientReachReading } from "./client-reach";
import { UpdateClientIdentityAsCoachUseCase } from "./update-client-identity-as-coach-use-case";
import { UpdateOwnClientIdentityUseCase } from "./update-own-client-identity-use-case";

const NOW = new Date("2026-10-24T10:00:00.000Z");

const STORED: ClientIdentity = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: null,
};

const EDITED = {
  firstName: "Ana-Maria",
  lastName: "Ionescu",
  phone: { country: "RO", nationalNumber: "0712345678" },
  dateOfBirth: "1994-03-15",
  country: "MD",
};

const SAVED_EDIT = { ...EDITED, phone: "+40712345678" };

function reachOf(portal: ClientReachReading["portal"]): ClientReachReading {
  return {
    clientId: "client-1",
    portal,
    coachingEndsAt: null,
    programStartsAt: null,
    paidThrough: null,
    timeZone: "Europe/Bucharest",
  };
}

function createPorts(
  stored: {
    reach?: ClientReachReading | null;
    identity?: ClientIdentity | null;
  } = {},
) {
  const reach =
    stored.reach === undefined ? reachOf("reachable") : stored.reach;

  return {
    clients: {
      findById: vi.fn().mockResolvedValue(reach),
      findByAuthSubjectId: vi.fn().mockResolvedValue(reach),
    } satisfies ClientReach,
    identities: {
      findByClientId: vi
        .fn()
        .mockResolvedValue(
          stored.identity === undefined ? STORED : stored.identity,
        ),
    } satisfies Pick<ClientIdentities, "findByClientId">,
    changes: {
      save: vi.fn().mockResolvedValue(undefined),
    } satisfies ClientIdentityChanges,
    clock: { now: () => NOW },
    countries: VisitorCountries.of([
      { code: "RO", callingCode: "+40" },
      { code: "MD", callingCode: "+373" },
    ]),
  };
}

describe("UpdateClientIdentityAsCoachUseCase", () => {
  it("saves her names, phone, date of birth, country and gender", async () => {
    // arrange
    const ports = createPorts();
    const useCase = new UpdateClientIdentityAsCoachUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: "client-1",
      identity: { ...EDITED, gender: "prefer_not_to_say" },
    });

    // assert
    expect(result).toEqual({ status: "saved" });
    expect(ports.clients.findById).toHaveBeenCalledWith("client-1");
    const [edit] = ports.changes.save.mock.calls[0] ?? [];
    expect(edit?.toSnapshot()).toEqual({
      clientId: "client-1",
      ...SAVED_EDIT,
      gender: "prefer_not_to_say",
    });
  });

  it("answers not-found for someone who is not a client", async () => {
    // arrange
    const ports = createPorts({ reach: null });
    const useCase = new UpdateClientIdentityAsCoachUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: "client-9",
      identity: { ...EDITED, gender: "female" },
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(ports.changes.save).not.toHaveBeenCalled();
  });

  it("names the problems and saves nothing", async () => {
    // arrange
    const ports = createPorts();
    const useCase = new UpdateClientIdentityAsCoachUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: "client-1",
      identity: { ...EDITED, firstName: "", gender: "female" },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { firstName: "missing" },
    });
    expect(ports.changes.save).not.toHaveBeenCalled();
  });
});

describe("UpdateOwnClientIdentityUseCase", () => {
  it("saves her names, phone, date of birth and country and keeps her gender", async () => {
    // arrange
    const ports = createPorts();
    const useCase = new UpdateOwnClientIdentityUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      identity: EDITED,
    });

    // assert
    expect(result).toEqual({ status: "saved" });
    expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    const [edit] = ports.changes.save.mock.calls[0] ?? [];
    expect(edit?.toSnapshot()).toEqual({
      clientId: "client-1",
      ...SAVED_EDIT,
      gender: "female",
    });
  });

  it.each([
    ["a subject bound to no client", { reach: null }, "not-on-journey"],
    ["a client whose portal has ended", { reach: reachOf("ended") }, "ended"],
    ["a client with no identity", { identity: null }, "not-on-journey"],
  ] as const)("saves nothing for %s", async (_label, stored, status) => {
    // arrange
    const ports = createPorts(stored);
    const useCase = new UpdateOwnClientIdentityUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      identity: EDITED,
    });

    // assert
    expect(result).toEqual({ status });
    expect(ports.changes.save).not.toHaveBeenCalled();
  });

  it("names the problems and saves nothing", async () => {
    // arrange
    const ports = createPorts();
    const useCase = new UpdateOwnClientIdentityUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      identity: { ...EDITED, dateOfBirth: "2015-01-01" },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { dateOfBirth: "too-young" },
    });
  });
});
