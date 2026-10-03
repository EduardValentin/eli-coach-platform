import { describe, expect, it, vi } from "vitest";

import {
  UnitPreference,
  type ClientUnitPreferencesSource,
} from "../unit-preference";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import { emptyDraft } from "./onboarding-draft";
import type { OnboardingClient, OnboardingClients } from "./onboarding-clients";
import { ReadClientOnboardingUseCase } from "./read-client-onboarding-use-case";

const CLIENT: OnboardingClient = {
  clientId: "client-1",
  gender: "female",
  dateOfBirth: "1994-05-12",
  firstName: "Ana",
  lastName: "Popescu",
  country: "RO",
  phone: "+40712345678",
  email: "ana@example.com",
  submittedAt: null,
  reviewStamps: {
    reviewOpenedAt: null,
    detailsRequestedAt: null,
    detailsAnsweredAt: null,
    answersApprovedAt: null,
  },
  coachingClosed: false,
};
const DRAFT = emptyDraft(new Date("2026-09-28T10:00:00.000Z"));

function createClients(found: OnboardingClient | null) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(found),
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies OnboardingClients;
}

function createOnboardings() {
  return {
    findByClientId: vi
      .fn()
      .mockResolvedValue({ draft: DRAFT, submission: null }),
  } satisfies ClientOnboardingSource;
}

function createUnitPreferences(
  found: Awaited<ReturnType<ClientUnitPreferencesSource["findByClientId"]>>,
) {
  return {
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies ClientUnitPreferencesSource;
}

describe("ReadClientOnboardingUseCase", () => {
  it("reads her onboarding with the units she chose", async () => {
    // arrange
    const onboardings = createOnboardings();
    const unitPreferences = createUnitPreferences(
      UnitPreference.of("imperial"),
    );
    const useCase = new ReadClientOnboardingUseCase({
      clients: createClients(CLIENT),
      onboardings,
      unitPreferences,
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
    expect(unitPreferences.findByClientId).toHaveBeenCalledWith("client-1");
  });

  it("reads metric units while she has chosen none", async () => {
    // arrange
    const useCase = new ReadClientOnboardingUseCase({
      clients: createClients(CLIENT),
      onboardings: createOnboardings(),
      unitPreferences: createUnitPreferences(null),
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
      clients: createClients(null),
      onboardings,
      unitPreferences: createUnitPreferences(null),
    });

    // act
    const result = await useCase.execute("user_stranger");

    // assert
    expect(result).toBeNull();
    expect(onboardings.findByClientId).not.toHaveBeenCalled();
  });
});
