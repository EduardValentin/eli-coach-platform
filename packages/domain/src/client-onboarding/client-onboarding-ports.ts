import type {
  ActivityLevel,
  GoalType,
  MacroSplit,
  MetabolicSex,
  OnboardedClient,
} from "./client-onboarding-model";

export type OnboardClientCommand = {
  coachNotes: string | null;
  dailyCalories: number;
  dateOfBirth: string;
  dietaryRestrictions: string | null;
  email: string;
  firstName: string;
  goalType: GoalType;
  heightCm: number;
  idempotencyKey: string;
  lastName: string;
  macroSplit: MacroSplit;
  sex: MetabolicSex;
  activityLevel: ActivityLevel;
  targetWeightKg: number;
  weightKg: number;
};

/**
 * What the repository can report about the invitation it wrote. The raw token is
 * deliberately absent: only its hash reaches the database, so the controller
 * that minted it is the only place it exists in the clear.
 */
export type IssuedInvitation = OnboardedClient;

export type OnboardClientOutcome =
  | { status: "onboarded"; invitation: IssuedInvitation }
  | { status: "already_a_client" }
  | { status: "idempotency_conflict" }
  | { status: "replayed"; invitation: IssuedInvitation };

export interface ClientOnboardingRepository {
  /**
   * Records the profile, client, measurement, goal, targets and invitation as
   * one unit. Implementations must not leave a client without its goal.
   */
  onboardClient(
    command: OnboardClientCommand & {
      basalMetabolicRate: number;
      expiresAt: Date;
      payloadDigest: string;
      tokenHash: string;
      totalDailyEnergyExpenditure: number;
    },
  ): Promise<OnboardClientOutcome>;
}

export interface InvitationTokenGenerator {
  generateToken(): string;
}

export interface InvitationTokenHasher {
  hashToken(token: string): string;
}

export interface PayloadDigestGenerator {
  digestPayload(payload: string): string;
}

export type SendClientInvitationCommand = {
  acceptUrl: string;
  coachName: string;
  firstName: string;
  idempotencyKey: string;
  replacedPendingInvitation: boolean;
  to: string;
};

export interface ClientInvitationService {
  sendInvitation(command: SendClientInvitationCommand): Promise<void>;
}
