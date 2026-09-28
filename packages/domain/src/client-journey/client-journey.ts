import type { VisitorGender } from "../assessment-call";

export type ClientJourneyStep = "welcome" | "onboarding";

export type WelcomeWording = "five-part" | "four-part";

type ClientJourneyProps = {
  clientId: string;
  firstName: string;
  gender: VisitorGender;
  welcomeSeenAt: Date | null;
};

export class ClientJourney {
  readonly clientId: string;
  readonly firstName: string;
  readonly gender: VisitorGender;
  readonly welcomeSeenAt: Date | null;

  private constructor(props: ClientJourneyProps) {
    this.clientId = props.clientId;
    this.firstName = props.firstName;
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
}
