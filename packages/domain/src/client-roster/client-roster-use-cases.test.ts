import { describe, expect, it, vi } from "vitest";

import { AssessmentCall } from "../assessment-call";
import type { AssessmentCallReader } from "../payment-link";
import type { ClientRoster, ClientRosterEntry } from "./client-roster";
import type { ClientRosterIncidents } from "./client-roster-incidents";
import { ListClientsUseCase } from "./list-clients-use-case";
import { ReadClientRecordUseCase } from "./read-client-record-use-case";

const PAID_AT = new Date("2026-09-26T10:00:00.000Z");
const SUBMITTED_AT = new Date("2026-09-28T10:00:00.000Z");

function entry(
  overrides: {
    clientId?: string;
    accountBound?: boolean;
    onboardingSubmittedAt?: Date | null;
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
    },
    accountBound: overrides.accountBound ?? true,
    profile: {
      email: "ana@example.com",
      dateOfBirth: "1994-03-14",
      gender: "female",
      country: "RO",
      phone: "+40700000000",
      primaryGoal: "build_strength",
      assessmentCallId: "call-1",
    },
    subscription: {
      bundleId: "3-months",
      months: 3,
      tier: "regular",
      paidAt: PAID_AT,
      startChoice: "immediate",
      status: "not-started",
    },
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
    });

    // act
    const result = await useCase.execute();

    // assert
    expect(result).toEqual({
      status: "listed",
      clients: [
        { ...invited, status: "invited" },
        { ...submitted, status: "awaiting-review" },
      ],
    });
  });

  it("answers unavailable and logs the failure when the roster cannot be read", async () => {
    // arrange
    const failure = new Error("database down");
    const incidents = createIncidents();
    const useCase = new ListClientsUseCase({
      roster: createRoster({ list: vi.fn().mockRejectedValue(failure) }),
      incidents,
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
          firstName: "Ana",
          lastName: "Popescu",
          visitorEmail: "ana@example.com",
          visitorNotes,
          dateOfBirth: "1994-03-14",
          gender: "female",
          primaryGoal: "build_strength",
          country: "RO",
          phone: null,
          startsAt: new Date("2026-09-25T15:00:00.000Z"),
          visitorTimeZone: "Europe/Bucharest",
          coachTimeZone: "Europe/Bucharest",
          bookedAt: new Date("2026-09-20T09:12:00.000Z"),
        }).toSnapshot(),
      ),
    } satisfies AssessmentCallReader;
  }

  it("reads her record with her status and the notes she left when booking", async () => {
    // arrange
    const found = entry({ onboardingSubmittedAt: SUBMITTED_AT });
    const calls = callReader("I train at home.");
    const roster = createRoster({ findById: vi.fn().mockResolvedValue(found) });
    const useCase = new ReadClientRecordUseCase({ roster, calls });

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result).toEqual({
      ...found,
      status: "awaiting-review",
      bookingNotes: "I train at home.",
    });
    expect(roster.findById).toHaveBeenCalledWith("client-1");
    expect(calls.findById).toHaveBeenCalledWith("call-1");
  });

  it("reads no booking notes when her call is gone", async () => {
    // arrange
    const found = entry();
    const useCase = new ReadClientRecordUseCase({
      roster: createRoster({ findById: vi.fn().mockResolvedValue(found) }),
      calls: { findById: vi.fn().mockResolvedValue(null) },
    });

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result).toMatchObject({ status: "onboarding", bookingNotes: null });
  });

  it("reads nothing for an unknown client", async () => {
    // arrange
    const calls = callReader(null);
    const useCase = new ReadClientRecordUseCase({
      roster: createRoster(),
      calls,
    });

    // act
    const result = await useCase.execute("client-9");

    // assert
    expect(result).toBeNull();
    expect(calls.findById).not.toHaveBeenCalled();
  });
});
