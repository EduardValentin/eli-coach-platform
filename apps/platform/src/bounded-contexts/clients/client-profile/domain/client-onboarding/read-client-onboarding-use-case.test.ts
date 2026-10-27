import { describe, expect, it, vi } from "vitest";

import {
  CoachingStanding,
  type ClientIdentities,
  type ClientIdentity,
} from "~/bounded-contexts/clients/clients/domain/client";
import {
  ClientSettings,
  UnitPreference,
  type ClientSettingsSource,
} from "../client-settings";

import type { ClientOnboardingSource } from "./client-onboarding-source";
import { emptyDraft } from "./onboarding-draft";
import type { OnboardingClient, OnboardingClients } from "./onboarding-clients";
import { OnboardingParticipants } from "./onboarding-participants";
import { ReadClientOnboardingUseCase } from "./read-client-onboarding-use-case";

const CLIENT: OnboardingClient = {
  clientId: "client-1",
  submittedAt: null,
  reviewStamps: {
    reviewOpenedAt: null,
    detailsRequestedAt: null,
    detailsAnsweredAt: null,
    answersApprovedAt: null,
  },
  standing: CoachingStanding.of({
    status: "not-started",
    accessEndsAt: null,
    refundDue: false,
    bundleMonths: null,
    programStartsAt: null,
    paidThrough: null,
  }),
};
const IDENTITY: ClientIdentity = {
  clientId: "client-1",
  gender: "female",
  dateOfBirth: "1994-05-12",
  firstName: "Ana",
  lastName: "Popescu",
  country: "RO",
  phone: "+40712345678",
  email: "ana@example.com",
};
const DRAFT = emptyDraft(new Date("2026-09-28T10:00:00.000Z"));

function createClients(found: OnboardingClient | null) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(found),
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies OnboardingClients;
}

function createIdentities(found: ClientIdentity | null = IDENTITY) {
  return {
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies Pick<ClientIdentities, "findByClientId">;
}

function createOnboardings() {
  return {
    findByClientId: vi
      .fn()
      .mockResolvedValue({ draft: DRAFT, submission: null }),
  } satisfies ClientOnboardingSource;
}

function settingsWith(
  preference: UnitPreference | null,
): ClientSettings | null {
  return (
    preference &&
    ClientSettings.reconstitute({
      clientId: "client-1",
      unitPreference: preference.toSnapshot(),
      preferredCheckInWeekday: null,
      preferredChannel: null,
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    })
  );
}

function createSettings(found: UnitPreference | null) {
  return {
    findByClientId: vi.fn().mockResolvedValue(settingsWith(found)),
  } satisfies ClientSettingsSource;
}

describe("ReadClientOnboardingUseCase", () => {
  it("reads her onboarding with the units she chose", async () => {
    // arrange
    const onboardings = createOnboardings();
    const settings = createSettings(UnitPreference.of("imperial"));
    const useCase = new ReadClientOnboardingUseCase({
      participants: new OnboardingParticipants({
        clients: createClients(CLIENT),
        identities: createIdentities(),
      }),
      onboardings,
      settings,
    });

    // act
    const result = await useCase.execute("user_ana");

    // assert
    expect(result?.onboarding).toMatchObject({
      clientId: "client-1",
      gender: "female",
      dateOfBirth: "1994-05-12",
      draft: DRAFT,
      submission: null,
    });
    expect(result?.unitPreference.toSnapshot()).toEqual({
      weightUnit: "lb",
      heightUnit: "ft-in",
    });
    expect(onboardings.findByClientId).toHaveBeenCalledWith("client-1");
    expect(settings.findByClientId).toHaveBeenCalledWith("client-1");
  });

  it("reads metric units while she has chosen none", async () => {
    // arrange
    const useCase = new ReadClientOnboardingUseCase({
      participants: new OnboardingParticipants({
        clients: createClients(CLIENT),
        identities: createIdentities(),
      }),
      onboardings: createOnboardings(),
      settings: createSettings(null),
    });

    // act
    const result = await useCase.execute("user_ana");

    // assert
    expect(result?.unitPreference.toSnapshot()).toEqual({
      weightUnit: "kg",
      heightUnit: "cm",
    });
  });

  it("reads nothing for a subject bound to no client", async () => {
    // arrange
    const onboardings = createOnboardings();
    const useCase = new ReadClientOnboardingUseCase({
      participants: new OnboardingParticipants({
        clients: createClients(null),
        identities: createIdentities(),
      }),
      onboardings,
      settings: createSettings(null),
    });

    // act
    const result = await useCase.execute("user_stranger");

    // assert
    expect(result).toBeNull();
    expect(onboardings.findByClientId).not.toHaveBeenCalled();
  });

  it("reads nothing for a client with no identity", async () => {
    // arrange
    const onboardings = createOnboardings();
    const useCase = new ReadClientOnboardingUseCase({
      participants: new OnboardingParticipants({
        clients: createClients(CLIENT),
        identities: createIdentities(null),
      }),
      onboardings,
      settings: createSettings(null),
    });

    // act
    const result = await useCase.execute("user_ana");

    // assert
    expect(result).toBeNull();
    expect(onboardings.findByClientId).not.toHaveBeenCalled();
  });
});
