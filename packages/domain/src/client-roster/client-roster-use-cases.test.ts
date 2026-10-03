import { describe, expect, it, vi } from "vitest";

import { AssessmentCall } from "../assessment-call";
import {
  RefundDue,
  type CoachingSubscriptionSnapshot,
} from "../coaching-subscription";
import type { AssessmentCallReader } from "../payment-link";
import type { ClientRoster, ClientRosterEntry } from "./client-roster";
import type { ClientRosterIncidents } from "./client-roster-incidents";
import { ListClientsUseCase } from "./list-clients-use-case";
import { ReadClientRecordUseCase } from "./read-client-record-use-case";

const PAID_AT = new Date("2026-09-26T10:00:00.000Z");
const SUBMITTED_AT = new Date("2026-09-28T10:00:00.000Z");
const NOW = new Date("2026-10-20T10:00:00.000Z");
const clock = { now: () => NOW };

function subscriptionSnapshot(
  overrides: Partial<CoachingSubscriptionSnapshot> = {},
): CoachingSubscriptionSnapshot {
  return {
    id: "subscription-1",
    clientId: "client-1",
    bundleId: "3-months",
    months: 3,
    tier: "regular",
    amountCents: 44700,
    currency: "eur",
    paymentCustomerId: "cus_1",
    paymentSubscriptionId: "sub_1",
    checkoutSessionId: "cs_1",
    paidAt: PAID_AT,
    startChoice: "immediate",
    status: "not-started",
    cancelledAt: null,
    accessEndsAt: null,
    paymentProblemSince: null,
    refund: null,
    ...overrides,
  };
}

function entry(
  overrides: {
    clientId?: string;
    accountBound?: boolean;
    onboardingSubmittedAt?: Date | null;
    subscription?: CoachingSubscriptionSnapshot;
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
    booking: {
      email: "ana@example.com",
      gender: "female",
      assessmentCallId: "call-1",
    },
    subscription: overrides.subscription ?? subscriptionSnapshot(),
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
      subscription: subscriptionSnapshot({
        status: "ended",
        cancelledAt,
        accessEndsAt: cancelledAt,
        refund: RefundDue.full({
          amountCents: 44700,
          cancelledAt,
        }).toSnapshot(),
      }),
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
      subscriptionStatus: "not-started",
      workStartsOn: null,
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

  it("reads when the work starts for a client waiting out her withdrawal window", async () => {
    // arrange
    const useCase = new ReadClientRecordUseCase({
      roster: createRoster({
        findById: vi.fn().mockResolvedValue(
          entry({
            subscription: subscriptionSnapshot({ startChoice: "waiting" }),
          }),
        ),
      }),
      calls: callReader(null),
      clock,
    });

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result?.workStartsOn).toEqual(new Date("2026-10-10T10:00:00.000Z"));
  });

  it("reads her subscription as ended once her cancelled access has run out", async () => {
    // arrange
    const useCase = new ReadClientRecordUseCase({
      roster: createRoster({
        findById: vi.fn().mockResolvedValue(
          entry({
            subscription: subscriptionSnapshot({
              status: "cancelled",
              cancelledAt: PAID_AT,
              accessEndsAt: NOW,
            }),
          }),
        ),
      }),
      calls: callReader(null),
      clock,
    });

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result?.subscriptionStatus).toBe("ended");
  });

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
