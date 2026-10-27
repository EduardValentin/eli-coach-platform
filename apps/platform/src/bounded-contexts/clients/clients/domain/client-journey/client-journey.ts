import type { VisitorGender } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import { CoachingStanding, type CoachingStandingSnapshot } from "../client";

export type ClientJourneyStep =
  | "welcome"
  | "onboarding"
  | "submitted"
  | "in-review"
  | "needs-details"
  | "approved";

export const STEPS_AFTER_SUBMISSION = [
  "submitted",
  "in-review",
  "needs-details",
  "approved",
] as const satisfies readonly ClientJourneyStep[];

export type StepAfterSubmission = (typeof STEPS_AFTER_SUBMISSION)[number];

export type WelcomeWording = "five-part" | "four-part";

export type ClientJourneySnapshot = {
  clientId: string;
  firstName: string;
  lastName: string;
  gender: VisitorGender;
  welcomeSeenAt: Date | null;
  onboardingSubmittedAt: Date | null;
  reviewOpenedAt: Date | null;
  detailsRequestedAt: Date | null;
  detailsAnsweredAt: Date | null;
  answersApprovedAt: Date | null;
  standing: CoachingStandingSnapshot;
};

export class ClientJourney {
  readonly clientId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly gender: VisitorGender;
  readonly welcomeSeenAt: Date | null;
  readonly onboardingSubmittedAt: Date | null;
  readonly reviewOpenedAt: Date | null;
  readonly detailsRequestedAt: Date | null;
  readonly detailsAnsweredAt: Date | null;
  readonly answersApprovedAt: Date | null;
  readonly standing: CoachingStanding;

  private constructor(snapshot: ClientJourneySnapshot) {
    this.clientId = snapshot.clientId;
    this.firstName = snapshot.firstName;
    this.lastName = snapshot.lastName;
    this.gender = snapshot.gender;
    this.welcomeSeenAt = snapshot.welcomeSeenAt;
    this.onboardingSubmittedAt = snapshot.onboardingSubmittedAt;
    this.reviewOpenedAt = snapshot.reviewOpenedAt;
    this.detailsRequestedAt = snapshot.detailsRequestedAt;
    this.detailsAnsweredAt = snapshot.detailsAnsweredAt;
    this.answersApprovedAt = snapshot.answersApprovedAt;
    this.standing = CoachingStanding.of(snapshot.standing);
  }

  static from(snapshot: ClientJourneySnapshot): ClientJourney {
    return new ClientJourney(snapshot);
  }

  static isAfterSubmission(
    step: ClientJourneyStep,
  ): step is StepAfterSubmission {
    return STEPS_AFTER_SUBMISSION.some((submitted) => submitted === step);
  }

  step(): ClientJourneyStep {
    if (!this.onboardingSubmittedAt) {
      return this.welcomeSeenAt ? "onboarding" : "welcome";
    }
    if (this.answersApprovedAt) {
      return "approved";
    }
    if (this.awaitsDetails()) {
      return "needs-details";
    }

    return this.reviewOpenedAt ? "in-review" : "submitted";
  }

  welcomeWording(): WelcomeWording {
    return this.gender === "female" ? "five-part" : "four-part";
  }

  private awaitsDetails(): boolean {
    if (!this.detailsRequestedAt) {
      return false;
    }

    return (
      !this.detailsAnsweredAt ||
      this.detailsAnsweredAt < this.detailsRequestedAt
    );
  }

  toSnapshot(): ClientJourneySnapshot {
    return {
      clientId: this.clientId,
      firstName: this.firstName,
      lastName: this.lastName,
      gender: this.gender,
      welcomeSeenAt: this.welcomeSeenAt,
      onboardingSubmittedAt: this.onboardingSubmittedAt,
      reviewOpenedAt: this.reviewOpenedAt,
      detailsRequestedAt: this.detailsRequestedAt,
      detailsAnsweredAt: this.detailsAnsweredAt,
      answersApprovedAt: this.answersApprovedAt,
      standing: this.standing.toSnapshot(),
    };
  }
}
