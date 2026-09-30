import type { CoachingSalesJourney, Visitor } from "./coaching-sales-journey";
import type { AccountSession, PlatformRig } from "./platform-rig";
import { clerkServesUser } from "./wire-mock/expectations/clerk-backend-api";

export type OnboardingFormAnswers = Record<string, unknown>;

export type OnboardingAnswers = Record<string, OnboardingFormAnswers>;

export type ClientProfileRow = {
  heightCm: string | null;
  activityLevel: string | null;
  primaryGoal: string | null;
  dietaryRestrictions: string;
  clientNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewStampColumns = {
  reviewOpenedAt: Date | null;
  detailsRequestedAt: Date | null;
  detailsAnsweredAt: Date | null;
  answersApprovedAt: Date | null;
};

export type ReviewStampProjection = {
  recorded: ReviewStampColumns | undefined;
  derivedFromReviewRows: ReviewStampColumns;
};

type ReviewRow = { openedAt: Date; approvedAt: Date | null };

type DetailRequestMoments = { askedAt: Date; answeredAt: Date | null };

export type OnboardingConsentInstants = {
  specialCategoryAt: string | null;
  disclaimerAt: string | null;
  progressPhotosAt: string | null;
};

export const CLIENT_PORTAL = "/client";
export const SUBMISSION_API = "/api/client-onboarding/submission";
export const REGULAR_LAST_PERIOD_START = "2026-09-08";

const CONSENT_GIVEN_AT = new Date("2020-01-01T00:00:00.000Z");

export class ClientOnboardingJourney {
  constructor(
    private readonly rig: PlatformRig,
    private readonly sales: CoachingSalesJourney,
  ) {}

  async admit(visitor: Visitor, session: AccountSession): Promise<void> {
    await this.sales.payForCall(visitor);
    await this.bindInvitedClient(session);
  }

  async bindInvitedClient(session: AccountSession): Promise<void> {
    const [invitation] = await this.rig.suite.postgres.queryRows<{
      id: string;
    }>({
      sql: "select id from app.client_invitations",
      values: [],
    });

    if (!invitation) {
      throw new Error("The payment invited no one.");
    }

    await this.rig.suite.wireMock.stub(
      clerkServesUser(session.subjectId, { invitationId: invitation.id }),
    );
    const firstRequest = await this.rig.requestAs(session, CLIENT_PORTAL);

    if (firstRequest.status !== 302) {
      throw new Error(
        `Her first signed-in request answered ${firstRequest.status}.`,
      );
    }
  }

  async submit(session: AccountSession): Promise<void> {
    const response = await this.rig.requestAs(session, SUBMISSION_API, {
      body: JSON.stringify({
        answers: completeAnswers(REGULAR_LAST_PERIOD_START),
        consents: givenConsents(),
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (response.status !== 200) {
      throw new Error(`Her submission answered ${response.status}.`);
    }
  }

  async profileRowOf(clientId: string): Promise<ClientProfileRow | undefined> {
    const [row] = await this.rig.suite.postgres.queryRows<ClientProfileRow>({
      sql: 'select height_cm as "heightCm", activity_level as "activityLevel", primary_goal as "primaryGoal", dietary_restrictions as "dietaryRestrictions", client_notes as "clientNotes", created_at as "createdAt", updated_at as "updatedAt" from app.client_profiles where client_id = $1',
      values: [clientId],
    });

    return row;
  }

  async reviewStampProjectionOf(
    clientId: string,
  ): Promise<ReviewStampProjection> {
    const [[recorded], [review], [latestRequest]] = await Promise.all([
      this.rig.suite.postgres.queryRows<ReviewStampColumns>({
        sql: 'select review_opened_at as "reviewOpenedAt", details_requested_at as "detailsRequestedAt", details_answered_at as "detailsAnsweredAt", answers_approved_at as "answersApprovedAt" from app.clients where id = $1',
        values: [clientId],
      }),
      this.rig.suite.postgres.queryRows<ReviewRow>({
        sql: 'select opened_at as "openedAt", approved_at as "approvedAt" from app.client_onboarding_reviews where client_id = $1',
        values: [clientId],
      }),
      this.rig.suite.postgres.queryRows<DetailRequestMoments>({
        sql: 'select asked_at as "askedAt", answered_at as "answeredAt" from app.client_onboarding_detail_requests where client_id = $1 order by asked_at desc limit 1',
        values: [clientId],
      }),
    ]);

    return {
      recorded,
      derivedFromReviewRows: {
        reviewOpenedAt: review?.openedAt ?? null,
        detailsRequestedAt: latestRequest?.askedAt ?? null,
        detailsAnsweredAt: latestRequest?.answeredAt ?? null,
        answersApprovedAt: review?.approvedAt ?? null,
      },
    };
  }

  async clientIdOf(session: AccountSession): Promise<string> {
    const [client] = await this.rig.suite.postgres.queryRows<{ id: string }>({
      sql: "select id from app.clients where auth_subject_id = $1",
      values: [session.subjectId],
    });

    if (!client) {
      throw new Error("No client row exists for that session.");
    }

    return client.id;
  }
}

export function givenConsents(): OnboardingConsentInstants {
  return {
    specialCategoryAt: CONSENT_GIVEN_AT.toISOString(),
    disclaimerAt: CONSENT_GIVEN_AT.toISOString(),
    progressPhotosAt: null,
  };
}

export function completeAnswers(lastPeriodStart: string): OnboardingAnswers {
  return {
    "goal-availability": {
      weight: 66.1,
      height: 165,
      goalWeight: 62,
      primaryGoal: "Lose fat",
      blockers: ["Busy schedule"],
      experienceLevel: "I train regularly, but without a structured plan",
      trainingDaysPerWeek: "3 days",
      minutesPerSession: "45–60 minutes",
      previousPt: "No",
      coachExpectations: "Someone to keep me consistent and honest.",
      lifestyleActivityLevel: "Mostly sitting",
      availableEquipment: ["Full gym", "Dumbbells"],
      trainingPlace: "Gym",
    },
    "safety-screening": {
      heartCondition: "No",
      chestPainOnExertion: "No",
      dizzinessOrFainting: "No",
      chronicConditionDiagnosed: "No",
      chronicConditionMedication: "No",
      boneOrJointProblem: "Yes",
      boneOrJointProblemList: "Right shoulder aches on overhead pressing.",
      doctorProhibitedActivity: "No",
      parqDeclaration: true,
    },
    "cycle-context": {
      cycleRegularity: "Yes, and it's regular",
      cycleLength: 29,
      lastPeriodStart,
      hormonalContraception: "None",
      lifeStage: ["None of these"],
      perimenopauseOrMenopause: "No",
      gynaecologicalCondition: "No",
      recurringSymptoms: ["Fatigue", "Appetite changes"],
    },
    "nutrition-lifestyle": {
      eatingStyle: "No restrictions",
      allergiesOrIntolerances: "Yes",
      allergiesOrIntolerancesList: "Lactose, mild",
      mealsPerDay: "Three",
      snacksPerDay: "One",
      firstMeal: "7–9am",
      lastMeal: "6–8pm",
      energyDips: "Sometimes",
      energyDipsWhen: ["Afternoon"],
      jobType: "Mostly sitting",
      sleepHours: "6–7 hours",
      eatingOutFrequency: "Bring food from home",
      cookingSetup: "I do",
      cookingTime: "15–30 minutes",
      waterPerDay: "2–5 glasses",
      nutritionGoal: "Stop skipping meals when work gets busy.",
      checkInDay: "Monday",
      checkInChannel: "Email",
    },
    measurements: { waist: 74, hips: 98 },
  };
}
