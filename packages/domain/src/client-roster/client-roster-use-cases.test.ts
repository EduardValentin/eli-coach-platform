import { describe, expect, it, vi } from "vitest";

import { AssessmentCall, type AssessmentCallReader } from "../assessment-call";
import type { CoachingStandingSnapshot } from "../client";

import type { ClientRoster, ClientRosterEntry } from "./client-roster";
import type { ClientRosterIncidents } from "./client-roster-incidents";
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

function createRoster(overrides: Partial<ClientRoster> = {}) {
  return {
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    ...overrides,
  } satisfies ClientRoster;
}

function createIncidents() {
  return { rosterReadFailed: vi.fn() } satisfies ClientRosterIncidents;
}

describe("ListClientsUseCase", () => {
  it("lists every client with the status her facts derive", async () => {
    // arrange
    const invited = entry({ clientId: "client-1", accountBound: false });
    const submitted = entry({
      clientId: "client-2",
      onboardingSubmittedAt: SUBMITTED_AT,
    });
    const useCase = new ListClientsUseCase({
      roster: createRoster({
        list: vi.fn().mockResolvedValue([invited, submitted]),
      }),
      incidents: createIncidents(),
      clock,
    });

    // act
    const result = await useCase.execute();

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
      standing: { status: "ended", accessEndsAt: cancelledAt, refundDue: true },
    });
    const useCase = new ListClientsUseCase({
      roster: createRoster({ list: vi.fn().mockResolvedValue([ended]) }),
      incidents: createIncidents(),
      clock,
    });

    // act
    const result = await useCase.execute();

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
    const useCase = new ListClientsUseCase({
      roster: createRoster({ list: vi.fn().mockRejectedValue(failure) }),
      incidents,
      clock,
    });

    // act
    const result = await useCase.execute();

    // assert
    expect(result).toEqual({ status: "unavailable" });
    expect(incidents.rosterReadFailed).toHaveBeenCalledWith(failure);
  });
});

describe("ReadClientRecordUseCase", () => {
  function callReader(visitorNotes: string | null) {
    return {
      findById: vi.fn().mockResolvedValue(
        AssessmentCall.reconstitute({
          id: "call-1",
          firstName: "Ana-Maria",
          lastName: "Popescu",
          visitorEmail: "ana.booked@example.com",
          visitorNotes,
          dateOfBirth: "1994-03-14",
          gender: "female",
          primaryGoal: "lose_weight",
          country: "MD",
          phone: "+37360000000",
          startsAt: new Date("2026-09-25T15:00:00.000Z"),
          visitorTimeZone: "Europe/Bucharest",
          coachTimeZone: "Europe/Bucharest",
          bookedAt: new Date("2026-09-20T09:12:00.000Z"),
        }).toSnapshot(),
      ),
    } satisfies AssessmentCallReader;
  }

  it("reads her record with her status and the call she booked: when, who booked it, her goal and her notes", async () => {
    // arrange
    const found = entry({ onboardingSubmittedAt: SUBMITTED_AT });
    const calls = callReader("I train at home.");
    const roster = createRoster({ findById: vi.fn().mockResolvedValue(found) });
    const useCase = new ReadClientRecordUseCase({ roster, calls, clock });

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result).toEqual({
      ...found,
      status: "awaiting-review",
      needsRefund: false,
      subscriptionCancelledOrEnded: false,
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
    expect(calls.findById).toHaveBeenCalledWith("call-1");
  });

  it.each([
    [
      "cancelled with access left",
      { status: "cancelled", accessEndsAt: NOW, refundDue: false },
      { subscriptionCancelledOrEnded: true, needsRefund: false },
    ],
    [
      "ended with a refund still owed",
      { status: "ended", accessEndsAt: NOW, refundDue: true },
      { subscriptionCancelledOrEnded: true, needsRefund: true },
    ],
    [
      "active",
      { status: "active", accessEndsAt: null, refundDue: false },
      { subscriptionCancelledOrEnded: false, needsRefund: false },
    ],
  ] as const)(
    "reads a client whose coaching is %s from her standing",
    async (_label, standing, expected) => {
      // arrange
      const useCase = new ReadClientRecordUseCase({
        roster: createRoster({
          findById: vi.fn().mockResolvedValue(entry({ standing })),
        }),
        calls: callReader(null),
        clock,
      });

      // act
      const result = await useCase.execute("client-1");

      // assert
      expect(result).toMatchObject(expected);
    },
  );

  it("reads no notes when she left none when booking", async () => {
    // arrange
    const useCase = new ReadClientRecordUseCase({
      roster: createRoster({ findById: vi.fn().mockResolvedValue(entry()) }),
      calls: callReader(null),
      clock,
    });

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result?.assessmentCall.notes).toBeNull();
  });

  it("reads nothing when her call is gone", async () => {
    // arrange
    const useCase = new ReadClientRecordUseCase({
      roster: createRoster({ findById: vi.fn().mockResolvedValue(entry()) }),
      calls: { findById: vi.fn().mockResolvedValue(null) },
      clock,
    });

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result).toBeNull();
  });

  it("reads nothing for an unknown client", async () => {
    // arrange
    const calls = callReader(null);
    const useCase = new ReadClientRecordUseCase({
      roster: createRoster(),
      calls,
      clock,
    });

    // act
    const result = await useCase.execute("client-9");

    // assert
    expect(result).toBeNull();
    expect(calls.findById).not.toHaveBeenCalled();
  });
});
