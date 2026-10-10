import type { VisitorGender } from "../assessment-call";
import {
  formsForGender,
  reviewStageOf,
  type ReviewStamps,
} from "../client-onboarding";
import {
  CoachingSubscription,
  type CoachingSubscriptionSnapshot,
} from "../coaching-subscription";

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

export type CoachingStanding = "active" | "ended";

export type PortalReach = "reachable" | "awaiting_onboarding" | "ended";

export type ClientJourneySnapshot = ReviewStamps & {
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
  readonly reviewOpenedAt: Date | null;
  readonly detailsRequestedAt: Date | null;
  readonly detailsAnsweredAt: Date | null;
  readonly answersApprovedAt: Date | null;

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
  }

  static from(snapshot: ClientJourneySnapshot): ClientJourney {
    return new ClientJourney(snapshot);
  }

  static isAfterSubmission(
    step: ClientJourneyStep,
  ): step is StepAfterSubmission {
    return STEPS_AFTER_SUBMISSION.some((submitted) => submitted === step);
  }

  static coachingStandingOf(reading: {
    subscription: Pick<
      CoachingSubscriptionSnapshot,
      "status" | "accessEndsAt"
    > | null;
    at: Date;
  }): CoachingStanding {
    if (!reading.subscription) {
      return "active";
    }

    return CoachingSubscription.statusOf(reading.subscription, reading.at) ===
      "ended"
      ? "ended"
      : "active";
  }

  static portalReachOf(standing: {
    step: ClientJourneyStep;
    coaching: CoachingStanding;
  }): PortalReach {
    if (standing.coaching === "ended") {
      return "ended";
    }

    return ClientJourney.isAfterSubmission(standing.step)
      ? "reachable"
      : "awaiting_onboarding";
  }

  step(): ClientJourneyStep {
    const reviewStage = reviewStageOf({
      submittedAt: this.onboardingSubmittedAt,
      stamps: this,
    });

    if (reviewStage === "awaiting-review") {
      return "submitted";
    }
    if (reviewStage) {
      return reviewStage;
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
      reviewOpenedAt: this.reviewOpenedAt,
      detailsRequestedAt: this.detailsRequestedAt,
      detailsAnsweredAt: this.detailsAnsweredAt,
      answersApprovedAt: this.answersApprovedAt,
    };
  }
}
