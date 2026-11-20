import type { ClientIdentity } from "../client-identities-port";
import type { ClientGender, OnboardingClient } from "../client-onboarding";
import {
  BODYWEIGHT_ONLY,
  CLIENT_EQUIPMENT,
  PRIMARY_GOALS,
  type ClientEquipment,
  type ClientProfile,
  type CoachingFactsSnapshot,
} from "../client-profile";

type ClientCoachingFacts = Pick<
  CoachingFactsSnapshot,
  "primaryGoal" | "level" | "trainingDays" | "sessionMinutes" | "equipment"
>;

type EquipmentOption = {
  equipment: ClientEquipment;
  exclusive: boolean;
};

type ClientCoachingSources = {
  identity: ClientIdentity;
  client: OnboardingClient;
  answersApprovedAt: Date | null;
  profile: ClientProfile | null;
  now: Date;
};

type ClientCoachingFields = {
  clientId: string;
  firstName: string;
  lastName: string;
  gender: ClientGender;
  answersApproved: boolean;
  coachingEnded: boolean;
  facts: ClientCoachingFacts | null;
};

export class ClientCoaching {
  readonly clientId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly gender: ClientGender;
  readonly answersApproved: boolean;
  readonly coachingEnded: boolean;
  readonly facts: ClientCoachingFacts | null;
  readonly equipmentOptions: readonly EquipmentOption[] = CLIENT_EQUIPMENT.map(
    (equipment) => ({ equipment, exclusive: equipment === BODYWEIGHT_ONLY }),
  );
  readonly primaryGoalOptions = PRIMARY_GOALS;

  private constructor(fields: ClientCoachingFields) {
    this.clientId = fields.clientId;
    this.firstName = fields.firstName;
    this.lastName = fields.lastName;
    this.gender = fields.gender;
    this.answersApproved = fields.answersApproved;
    this.coachingEnded = fields.coachingEnded;
    this.facts = fields.facts;
  }

  static of(sources: ClientCoachingSources): ClientCoaching {
    const { identity, client, answersApprovedAt, profile, now } = sources;

    return new ClientCoaching({
      clientId: identity.clientId,
      firstName: identity.firstName,
      lastName: identity.lastName,
      gender: identity.gender,
      answersApproved: answersApprovedAt !== null,
      coachingEnded: !client.standing.hasPortalAccessAt(now),
      facts: ClientCoaching.factsOf(profile),
    });
  }

  private static factsOf(
    profile: ClientProfile | null,
  ): ClientCoachingFacts | null {
    const coaching = profile?.toSnapshot().coaching;

    return coaching
      ? {
          primaryGoal: coaching.primaryGoal,
          level: coaching.level,
          trainingDays: coaching.trainingDays,
          sessionMinutes: coaching.sessionMinutes,
          equipment: coaching.equipment,
        }
      : null;
  }
}
