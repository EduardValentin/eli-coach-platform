import type { VisitorGender } from "../assessment-call";
import type { MeasurementEntry } from "../measurement";

export type ClientProfileIdentity = {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: VisitorGender;
  country: string;
  phone: string | null;
};

export type OnboardingProfileFacts = {
  heightCm: number | null;
  startingWeightKg: number | null;
  activityLevel: string | null;
  primaryGoal: string | null;
  dietaryRestrictions: string;
  clientNotes: string | null;
};

export type ClientProfileSnapshot = ClientProfileIdentity &
  OnboardingProfileFacts & {
    currentWeightKg: number | null;
    updatedAt: Date;
  };

type ProfileFromOnboardingInput = {
  identity: ClientProfileIdentity;
  facts: OnboardingProfileFacts;
  latestMeasurement: MeasurementEntry | null;
  now: Date;
};

export class ClientProfile {
  private constructor(private readonly snapshot: ClientProfileSnapshot) {}

  static fromOnboarding(input: ProfileFromOnboardingInput): ClientProfile {
    const { identity, facts } = input;

    return new ClientProfile({
      clientId: identity.clientId,
      firstName: identity.firstName,
      lastName: identity.lastName,
      email: identity.email,
      dateOfBirth: identity.dateOfBirth,
      gender: identity.gender,
      country: identity.country,
      phone: identity.phone,
      heightCm: facts.heightCm,
      startingWeightKg: facts.startingWeightKg,
      currentWeightKg: input.latestMeasurement?.weightKg ?? null,
      activityLevel: facts.activityLevel,
      primaryGoal: facts.primaryGoal,
      dietaryRestrictions: facts.dietaryRestrictions,
      clientNotes: facts.clientNotes,
      updatedAt: input.now,
    });
  }

  static reconstitute(snapshot: ClientProfileSnapshot): ClientProfile {
    return new ClientProfile(snapshot);
  }

  toSnapshot(): ClientProfileSnapshot {
    return { ...this.snapshot };
  }
}
