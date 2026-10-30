import { describe, expect, it, vi } from "vitest";

import type { CoachingStandingSnapshot } from "../client";
import type { ClientCallsPort } from "../client-journey";

import type { ClientRosterEntry } from "./client-roster";
import type { ClientRosterPort } from "./client-roster-port";
import type { ClientRosterIncidentsPort } from "./client-roster-incidents-port";
import { ListClientsUseCase } from "./list-clients-use-case";
import { ReadClientRecordUseCase } from "./read-client-record-use-case";

const JOINED_AT = new Date("2026-09-26T10:00:00.000Z");
const SUBMITTED_AT = new Date("2026-09-28T10:00:00.000Z");
const NOW = new Date("2026-10-20T10:00:00.000Z");
const clock = { now: () => NOW };

const NOT_STARTED: CoachingStandingSnapshot = {
  status: "not-started",
  accessEndsAt: null,
  refundDue: false,
  bundleMonths: null,
  programStartsAt: null,
  paidThrough: null,
};

function entry(
  overrides: {
    clientId?: string;
    accountBound?: boolean;
    onboardingSubmittedAt?: Date | null;
    standing?: CoachingStandingSnapshot;
  } = {},
): ClientRosterEntry {
  return {
    journey: {
      clientId: overrides.clientId ?? "client-1",
      firstName: "Ana",
      lastName: "Popescu",
      gender: "female",
      welcomeSeenAt: null,
      onboardingSubmittedAt: overrides.onboardingSubmittedAt ?? null,
      reviewOpenedAt: null,
      detailsRequestedAt: null,
      detailsAnsweredAt: null,
      answersApprovedAt: null,
      standing: overrides.standing ?? NOT_STARTED,
    },
    accountBound: overrides.accountBound ?? true,
    booking: {
      email: "ana@example.com",
      gender: "female",
      assessmentCallId: "call-1",
    },
    joinedAt: JOINED_AT,
  };
}

function createRoster(clientRosterPort: Partial<ClientRosterPort> = {}) {
  return {
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    ...clientRosterPort,
  } satisfies ClientRosterPort;
}

function createIncidents() {
  return { rosterReadFailed: vi.fn() } satisfies ClientRosterIncidentsPort;
}

describe("ListClientsUseCase", () => {
  it("lists every client with the status her facts derive", async () => {
    // arrange
    const invited = entry({ clientId: "client-1", accountBound: false });
    const submitted = entry({
      clientId: "client-2",
      onboardingSubmittedAt: SUBMITTED_AT,
    });
    const listClientsUseCase = new ListClientsUseCase({
      clientRosterPort: createRoster({
        list: vi.fn().mockResolvedValue([invited, submitted]),
      }),
      clientRosterIncidentsPort: createIncidents(),
      clockPort: clock,
    });

    // act
    const result = await listClientsUseCase.execute();

    // assert
    expect(result).toEqual({
      status: "listed",
      clients: [
        { ...invited, status: "invited", needsRefund: false },
        { ...submitted, status: "awaiting-review", needsRefund: false },
      ],
    });
  });

  it("lists a client whose refund is still owed as inactive and needing a refund", async () => {
    // arrange
    const cancelledAt = new Date("2026-10-05T10:00:00.000Z");
    const ended = entry({
      onboardingSubmittedAt: SUBMITTED_AT,
      standing: {
        status: "ended",
        accessEndsAt: cancelledAt,
        refundDue: true,
        bundleMonths: 3,
        programStartsAt: null,
        paidThrough: null,
      },
    });
    const listClientsUseCase = new ListClientsUseCase({
      clientRosterPort: createRoster({
        list: vi.fn().mockResolvedValue([ended]),
      }),
      clientRosterIncidentsPort: createIncidents(),
      clockPort: clock,
    });

    // act
    const result = await listClientsUseCase.execute();

    // assert
    expect(result).toEqual({
      status: "listed",
      clients: [{ ...ended, status: "inactive", needsRefund: true }],
    });
  });

  it("answers unavailable and logs the failure when the roster cannot be read", async () => {
    // arrange
    const failure = new Error("database down");
    const incidents = createIncidents();
    const listClientsUseCase = new ListClientsUseCase({
      clientRosterPort: createRoster({
        list: vi.fn().mockRejectedValue(failure),
      }),
      clientRosterIncidentsPort: incidents,
      clockPort: clock,
    });

    // act
    const result = await listClientsUseCase.execute();

    // assert
    expect(result).toEqual({ status: "unavailable" });
    expect(incidents.rosterReadFailed).toHaveBeenCalledWith(failure);
  });
});

describe("ReadClientRecordUseCase", () => {
  function callReader(notes: string | null) {
    return {
      callOf: vi.fn().mockResolvedValue({
        startsAt: new Date("2026-09-25T15:00:00.000Z"),
        firstName: "Ana-Maria",
        lastName: "Popescu",
        email: "ana.booked@example.com",
        dateOfBirth: "1994-03-14",
        gender: "female",
        country: "MD",
        phone: "+37360000000",
        primaryGoal: "lose_weight",
        notes,
      }),
    } satisfies ClientCallsPort;
  }

  it("reads her record with her status and the call she booked: when, who booked it, her goal and her notes", async () => {
    // arrange
    const found = entry({ onboardingSubmittedAt: SUBMITTED_AT });
    const calls = callReader("I train at home.");
    const roster = createRoster({ findById: vi.fn().mockResolvedValue(found) });
    const readClientRecordUseCase = new ReadClientRecordUseCase({
      clientRosterPort: roster,
      clientCallsPort: calls,
      clockPort: clock,
    });

    // act
    const result = await readClientRecordUseCase.execute("client-1");

    // assert
    expect(result).toEqual({
      ...found,
      status: "awaiting-review",
      needsRefund: false,
      coachingCancelledOrEnded: false,
      assessmentCall: {
        startsAt: new Date("2026-09-25T15:00:00.000Z"),
        firstName: "Ana-Maria",
        lastName: "Popescu",
        email: "ana.booked@example.com",
        dateOfBirth: "1994-03-14",
        gender: "female",
        country: "MD",
        phone: "+37360000000",
        primaryGoal: "lose_weight",
        notes: "I train at home.",
      },
    });
    expect(roster.findById).toHaveBeenCalledWith("client-1");
    expect(calls.callOf).toHaveBeenCalledWith("call-1");
  });

  it.each([
    [
      "cancelled with access left",
      {
        status: "cancelled",
        accessEndsAt: NOW,
        refundDue: false,
        bundleMonths: 3,
        programStartsAt: null,
        paidThrough: null,
      },
      { coachingCancelledOrEnded: true, needsRefund: false },
    ],
    [
      "ended with a refund still owed",
      {
        status: "ended",
        accessEndsAt: NOW,
        refundDue: true,
        bundleMonths: 3,
        programStartsAt: null,
        paidThrough: null,
      },
      { coachingCancelledOrEnded: true, needsRefund: true },
    ],
    [
      "active",
      {
        status: "active",
        accessEndsAt: null,
        refundDue: false,
        bundleMonths: 3,
        programStartsAt: null,
        paidThrough: null,
      },
      { coachingCancelledOrEnded: false, needsRefund: false },
    ],
  ] as const)(
    "reads a client whose coaching is %s from her standing",
    async (_label, standing, expected) => {
      // arrange
      const readClientRecordUseCase = new ReadClientRecordUseCase({
        clientRosterPort: createRoster({
          findById: vi.fn().mockResolvedValue(entry({ standing })),
        }),
        clientCallsPort: callReader(null),
        clockPort: clock,
      });

      // act
      const result = await readClientRecordUseCase.execute("client-1");

      // assert
      expect(result).toMatchObject(expected);
    },
  );

  it("reads no notes when she left none when booking", async () => {
    // arrange
    const readClientRecordUseCase = new ReadClientRecordUseCase({
      clientRosterPort: createRoster({
        findById: vi.fn().mockResolvedValue(entry()),
      }),
      clientCallsPort: callReader(null),
      clockPort: clock,
    });

    // act
    const result = await readClientRecordUseCase.execute("client-1");

    // assert
    expect(result?.assessmentCall.notes).toBeNull();
  });

  it("reads nothing when her call is gone", async () => {
    // arrange
    const readClientRecordUseCase = new ReadClientRecordUseCase({
      clientRosterPort: createRoster({
        findById: vi.fn().mockResolvedValue(entry()),
      }),
      clientCallsPort: { callOf: vi.fn().mockResolvedValue(null) },
      clockPort: clock,
    });

    // act
    const result = await readClientRecordUseCase.execute("client-1");

    // assert
    expect(result).toBeNull();
  });

  it("reads nothing for an unknown client", async () => {
    // arrange
    const calls = callReader(null);
    const readClientRecordUseCase = new ReadClientRecordUseCase({
      clientRosterPort: createRoster(),
      clientCallsPort: calls,
      clockPort: clock,
    });

    // act
    const result = await readClientRecordUseCase.execute("client-9");

    // assert
    expect(result).toBeNull();
    expect(calls.callOf).not.toHaveBeenCalled();
  });
});
