import { describe, expect, it, vi } from "vitest";

import { CoachingStanding } from "~/bounded-contexts/clients/clients/domain/client";
import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "../client-identities-port";
import {
  ClientSettings,
  UnitPreference,
  type ClientSettingsSourcePort,
} from "../client-settings";

import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import { emptyDraft } from "./onboarding-draft";
import type {
  OnboardingClient,
  OnboardingClientsPort,
} from "./onboarding-clients-port";
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
  } satisfies OnboardingClientsPort;
}

function createIdentities(found: ClientIdentity | null = IDENTITY) {
  return {
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies Pick<ClientIdentitiesPort, "findByClientId">;
}

function createOnboardings() {
  return {
    findByClientId: vi
      .fn()
      .mockResolvedValue({ draft: DRAFT, submission: null }),
  } satisfies ClientOnboardingSourcePort;
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
  } satisfies ClientSettingsSourcePort;
}

describe("ReadClientOnboardingUseCase", () => {
  it("reads her onboarding with the units she chose", async () => {
    // arrange
    const onboardings = createOnboardings();
    const settings = createSettings(UnitPreference.of("imperial"));
    const readClientOnboardingUseCase = new ReadClientOnboardingUseCase({
      participants: new OnboardingParticipants({
        onboardingClientsPort: createClients(CLIENT),
        clientIdentitiesPort: createIdentities(),
      }),
      clientOnboardingSourcePort: onboardings,
      clientSettingsSourcePort: settings,
    });

    // act
    const result = await readClientOnboardingUseCase.execute("user_ana");

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
    const readClientOnboardingUseCase = new ReadClientOnboardingUseCase({
      participants: new OnboardingParticipants({
        onboardingClientsPort: createClients(CLIENT),
        clientIdentitiesPort: createIdentities(),
      }),
      clientOnboardingSourcePort: createOnboardings(),
      clientSettingsSourcePort: createSettings(null),
    });

    // act
    const result = await readClientOnboardingUseCase.execute("user_ana");

    // assert
    expect(result?.unitPreference.toSnapshot()).toEqual({
      weightUnit: "kg",
      heightUnit: "cm",
    });
  });

  it("reads nothing for a subject bound to no client", async () => {
    // arrange
    const onboardings = createOnboardings();
    const readClientOnboardingUseCase = new ReadClientOnboardingUseCase({
      participants: new OnboardingParticipants({
        onboardingClientsPort: createClients(null),
        clientIdentitiesPort: createIdentities(),
      }),
      clientOnboardingSourcePort: onboardings,
      clientSettingsSourcePort: createSettings(null),
    });

    // act
    const result = await readClientOnboardingUseCase.execute("user_stranger");

    // assert
    expect(result).toBeNull();
    expect(onboardings.findByClientId).not.toHaveBeenCalled();
  });

  it("reads nothing for a client with no identity", async () => {
    // arrange
    const onboardings = createOnboardings();
    const readClientOnboardingUseCase = new ReadClientOnboardingUseCase({
      participants: new OnboardingParticipants({
        onboardingClientsPort: createClients(CLIENT),
        clientIdentitiesPort: createIdentities(null),
      }),
      clientOnboardingSourcePort: onboardings,
      clientSettingsSourcePort: createSettings(null),
    });

    // act
    const result = await readClientOnboardingUseCase.execute("user_ana");

    // assert
    expect(result).toBeNull();
    expect(onboardings.findByClientId).not.toHaveBeenCalled();
  });
});
