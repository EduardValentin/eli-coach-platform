import type { VisitorGender } from "../assessment-call";

export type ClientJourneyStep = "welcome" | "onboarding";

export type WelcomeWording = "five-part" | "four-part";

export type ClientJourneySnapshot = {
  clientId: string;
  firstName: string;
  lastName: string;
  gender: VisitorGender;
  welcomeSeenAt: Date | null;
};

export class ClientJourney {
  readonly clientId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly gender: VisitorGender;
  readonly welcomeSeenAt: Date | null;

  private constructor(snapshot: ClientJourneySnapshot) {
    this.clientId = snapshot.clientId;
    this.firstName = snapshot.firstName;
    this.lastName = snapshot.lastName;
    this.gender = snapshot.gender;
    this.welcomeSeenAt = snapshot.welcomeSeenAt;
  }

  static from(snapshot: ClientJourneySnapshot): ClientJourney {
    return new ClientJourney(snapshot);
  }

  step(): ClientJourneyStep {
    return this.welcomeSeenAt ? "onboarding" : "welcome";
  }

  welcomeWording(): WelcomeWording {
    return this.gender === "male" ? "four-part" : "five-part";
  }

  toSnapshot(): ClientJourneySnapshot {
    return {
      clientId: this.clientId,
      firstName: this.firstName,
      lastName: this.lastName,
      gender: this.gender,
      welcomeSeenAt: this.welcomeSeenAt,
    };
  }
}
