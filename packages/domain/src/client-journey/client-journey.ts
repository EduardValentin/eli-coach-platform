import type { VisitorGender } from "../assessment-call";
import { formsForGender } from "../client-onboarding";

export type ClientJourneyStep = "welcome" | "onboarding" | "submitted";

export type WelcomeWording = "five-part" | "four-part";

export type ClientJourneySnapshot = {
  clientId: string;
  firstName: string;
  lastName: string;
  gender: VisitorGender;
  welcomeSeenAt: Date | null;
  onboardingSubmittedAt: Date | null;
};

export class ClientJourney {
  readonly clientId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly gender: VisitorGender;
  readonly welcomeSeenAt: Date | null;
  readonly onboardingSubmittedAt: Date | null;

  private constructor(snapshot: ClientJourneySnapshot) {
    this.clientId = snapshot.clientId;
    this.firstName = snapshot.firstName;
    this.lastName = snapshot.lastName;
    this.gender = snapshot.gender;
    this.welcomeSeenAt = snapshot.welcomeSeenAt;
    this.onboardingSubmittedAt = snapshot.onboardingSubmittedAt;
  }

  static from(snapshot: ClientJourneySnapshot): ClientJourney {
    return new ClientJourney(snapshot);
  }

  step(): ClientJourneyStep {
    if (this.onboardingSubmittedAt) {
      return "submitted";
    }

    return this.welcomeSeenAt ? "onboarding" : "welcome";
  }

  welcomeWording(): WelcomeWording {
    const includesCycleForm = formsForGender(this.gender).some(
      (form) => form.id === "cycle-context",
    );

    return includesCycleForm ? "five-part" : "four-part";
  }

  toSnapshot(): ClientJourneySnapshot {
    return {
      clientId: this.clientId,
      firstName: this.firstName,
      lastName: this.lastName,
      gender: this.gender,
      welcomeSeenAt: this.welcomeSeenAt,
      onboardingSubmittedAt: this.onboardingSubmittedAt,
    };
  }
}
