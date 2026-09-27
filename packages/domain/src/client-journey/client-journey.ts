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

type ClientJourneyProps = ClientJourneySnapshot;

export class ClientJourney {
  readonly clientId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly gender: VisitorGender;
  readonly welcomeSeenAt: Date | null;

  private constructor(props: ClientJourneyProps) {
    this.clientId = props.clientId;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.gender = props.gender;
    this.welcomeSeenAt = props.welcomeSeenAt;
  }

  static from(props: ClientJourneyProps): ClientJourney {
    return new ClientJourney(props);
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
