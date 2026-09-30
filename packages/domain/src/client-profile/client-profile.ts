export type OnboardingProfileFacts = {
  heightCm: number | null;
  activityLevel: string | null;
  primaryGoal: string | null;
  dietaryRestrictions: string;
  clientNotes: string | null;
};

export type ClientProfileSnapshot = OnboardingProfileFacts & {
  clientId: string;
  updatedAt: Date;
};

type ProfileFromOnboardingInput = {
  clientId: string;
  facts: OnboardingProfileFacts;
  now: Date;
};

export class ClientProfile {
  private constructor(private readonly snapshot: ClientProfileSnapshot) {}

  static fromOnboarding(input: ProfileFromOnboardingInput): ClientProfile {
    return new ClientProfile({
      clientId: input.clientId,
      ...onlyProfileFacts(input.facts),
      updatedAt: input.now,
    });
  }

  static reconstitute(snapshot: ClientProfileSnapshot): ClientProfile {
    return new ClientProfile(snapshot);
  }

  facts(): OnboardingProfileFacts {
    return onlyProfileFacts(this.snapshot);
  }

  toSnapshot(): ClientProfileSnapshot {
    return { ...this.snapshot };
  }
}

function onlyProfileFacts(
  facts: OnboardingProfileFacts,
): OnboardingProfileFacts {
  return {
    heightCm: facts.heightCm,
    activityLevel: facts.activityLevel,
    primaryGoal: facts.primaryGoal,
    dietaryRestrictions: facts.dietaryRestrictions,
    clientNotes: facts.clientNotes,
  };
}
