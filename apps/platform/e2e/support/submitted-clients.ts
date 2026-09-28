import {
  ONBOARDING_FORMS,
  type OnboardingAnswersByForm,
  type OnboardingFormAnswers,
} from "@eli-coach-platform/domain/client-onboarding";
import type pg from "pg";

import {
  daysBefore,
  inTransaction,
  insertInvitedClientRecords,
  insertPaidClientRecords,
  type ClientIdentity,
  type InvitationSeed,
  type PaidClient,
  type PaidClientIdentity,
  type StartChoice,
} from "./paid-clients";

export type SubmittedClient = PaidClient & { submittedAt: Date };

export type QuestionId = { formId: string; fieldId: string };

export type DetailRequestSeed = {
  questions: readonly QuestionId[];
  note: string;
};

export type ClientState =
  | "invited-pending"
  | "invited-expired"
  | "invited-email-failed"
  | "onboarding"
  | "awaiting-review"
  | "in-review"
  | "needs-details"
  | "approved";

export type ClientStateSeed = {
  identity: PaidClientIdentity;
  start: StartChoice;
  invitation: Omit<InvitationSeed, "standing">;
};

export const FIRST_MEASUREMENTS = {
  weightKg: 66.1,
  waistCm: 74,
  hipsCm: 98,
  thighCm: 57,
  armCm: 28,
} as const;

export const BONE_OR_JOINT_PROBLEM_LIST =
  "Right shoulder aches on overhead pressing.";

export const SLEEP_HOURS = "6–7 hours";

export const PROTOTYPE_DETAIL_REQUEST: DetailRequestSeed = {
  questions: [
    { formId: "nutrition-lifestyle", fieldId: "sleepHours" },
    { formId: "safety-screening", fieldId: "boneOrJointProblemList" },
  ],
  note: "Two quick things before I build your plan — tell me a little more about your sleep and about that shoulder.",
};

const LAST_PERIOD_DAYS_AGO = 10;

const INSERT_SUBMISSION = `
  insert into app.client_onboarding_submissions (
    client_id, answers, special_category_consented_at, disclaimer_consented_at,
    progress_photos_consented_at, submitted_at
  )
  values ($1, $2, $3, $3, null, $3)
`;
const INSERT_FIRST_MEASUREMENTS = `
  insert into app.client_measurements (
    client_id, recorded_at, weight_kg, waist_cm, hips_cm, thigh_cm, arm_cm
  )
  values ($1, $2, $3, $4, $5, $6, $7)
`;
const STAMP_SUBMISSION = `
  update app.clients
  set welcome_seen_at = $2, onboarding_submitted_at = $2
  where id = $1
`;
const RECORD_REVIEW_OPENED = `
  insert into app.client_onboarding_reviews (client_id, opened_at)
  values ($1, now())
  on conflict (client_id)
  do update set opened_at = coalesce(
    app.client_onboarding_reviews.opened_at,
    excluded.opened_at
  )
`;
const RECORD_DETAIL_REQUEST = `
  insert into app.client_onboarding_detail_requests (
    id, client_id, question_ids, note, asked_at
  )
  values (gen_random_uuid(), $1, $2, $3, now())
`;
const RECORD_APPROVAL = `
  insert into app.client_onboarding_reviews (client_id, opened_at, approved_at)
  values ($1, now(), now())
  on conflict (client_id)
  do update set
    opened_at = coalesce(app.client_onboarding_reviews.opened_at, now()),
    approved_at = now()
`;
const PROJECT_REVIEW_STAMPS = `
  update app.clients as client
  set
    review_opened_at = review.opened_at,
    answers_approved_at = review.approved_at,
    details_requested_at = latest_request.asked_at,
    details_answered_at = latest_request.answered_at
  from app.client_onboarding_reviews as review
  left join lateral (
    select asked_at, answered_at
    from app.client_onboarding_detail_requests as request
    where request.client_id = review.client_id
    order by asked_at desc
    limit 1
  ) as latest_request on true
  where client.id = review.client_id and client.id = $1
`;

export async function insertSubmittedClientRecords(
  pool: pg.Pool,
  identity: PaidClientIdentity,
  start: StartChoice = "waiting",
): Promise<SubmittedClient> {
  const client = await insertPaidClientRecords(pool, identity, start);
  const submittedAt = new Date();
  const answers = submittedAnswersFor(identity, submittedAt);

  await inTransaction(pool, async (connection) => {
    await connection.query(INSERT_SUBMISSION, [
      client.clientId,
      JSON.stringify(answers),
      submittedAt,
    ]);
    await connection.query(INSERT_FIRST_MEASUREMENTS, [
      client.clientId,
      submittedAt,
      FIRST_MEASUREMENTS.weightKg,
      FIRST_MEASUREMENTS.waistCm,
      FIRST_MEASUREMENTS.hipsCm,
      FIRST_MEASUREMENTS.thighCm,
      FIRST_MEASUREMENTS.armCm,
    ]);
    await connection.query(STAMP_SUBMISSION, [client.clientId, submittedAt]);
  });

  return { ...client, submittedAt };
}

export async function recordReviewOpened(
  pool: pg.Pool,
  clientId: string,
): Promise<void> {
  await inTransaction(pool, async (connection) => {
    await connection.query(RECORD_REVIEW_OPENED, [clientId]);
    await connection.query(PROJECT_REVIEW_STAMPS, [clientId]);
  });
}

export async function recordOpenDetailRequest(
  pool: pg.Pool,
  clientId: string,
  request: DetailRequestSeed,
): Promise<void> {
  requireKnownQuestions(request.questions);

  await inTransaction(pool, async (connection) => {
    await connection.query(RECORD_REVIEW_OPENED, [clientId]);
    await connection.query(RECORD_DETAIL_REQUEST, [
      clientId,
      JSON.stringify(request.questions),
      request.note,
    ]);
    await connection.query(PROJECT_REVIEW_STAMPS, [clientId]);
  });
}

export async function recordAnswersApproved(
  pool: pg.Pool,
  clientId: string,
): Promise<void> {
  await inTransaction(pool, async (connection) => {
    await connection.query(RECORD_APPROVAL, [clientId]);
    await connection.query(PROJECT_REVIEW_STAMPS, [clientId]);
  });
}

export async function insertClientInState(
  pool: pg.Pool,
  seed: ClientStateSeed,
  state: ClientState,
): Promise<PaidClient> {
  switch (state) {
    case "invited-pending":
      return insertInvited(pool, seed, "pending");
    case "invited-expired":
      return insertInvited(pool, seed, "expired");
    case "invited-email-failed":
      return insertInvited(pool, seed, "email-failed");
    case "onboarding":
      return insertPaidClientRecords(pool, seed.identity, seed.start);
    default:
      return insertReviewedClient(pool, seed, state);
  }
}

async function insertInvited(
  pool: pg.Pool,
  seed: ClientStateSeed,
  standing: InvitationSeed["standing"],
): Promise<PaidClient> {
  const identity: ClientIdentity = seed.identity;

  return insertInvitedClientRecords(pool, identity, {
    ...seed.invitation,
    standing,
  });
}

async function insertReviewedClient(
  pool: pg.Pool,
  seed: ClientStateSeed,
  state: "awaiting-review" | "in-review" | "needs-details" | "approved",
): Promise<SubmittedClient> {
  const client = await insertSubmittedClientRecords(
    pool,
    seed.identity,
    seed.start,
  );

  if (state === "in-review") {
    await recordReviewOpened(pool, client.clientId);
  }

  if (state === "needs-details") {
    await recordOpenDetailRequest(
      pool,
      client.clientId,
      PROTOTYPE_DETAIL_REQUEST,
    );
  }

  if (state === "approved") {
    await recordAnswersApproved(pool, client.clientId);
  }

  return client;
}

function submittedAnswersFor(
  identity: ClientIdentity,
  submittedAt: Date,
): OnboardingAnswersByForm {
  const lastPeriodStart = daysBefore(submittedAt, LAST_PERIOD_DAYS_AGO)
    .toISOString()
    .slice(0, 10);
  const cycleContext: OnboardingFormAnswers =
    identity.gender === "female"
      ? {
          cycleRegularity: "Yes, and it's regular",
          cycleLength: 29,
          lastPeriodStart,
          hormonalContraception: "None",
          lifeStage: ["None of these"],
          perimenopauseOrMenopause: "No",
          gynaecologicalCondition: "No",
          recurringSymptoms: ["Fatigue", "Appetite changes"],
        }
      : {};

  return {
    "goal-availability": {
      weight: FIRST_MEASUREMENTS.weightKg,
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
      boneOrJointProblemList: BONE_OR_JOINT_PROBLEM_LIST,
      doctorProhibitedActivity: "No",
      parqDeclaration: true,
    },
    "cycle-context": cycleContext,
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
      sleepHours: SLEEP_HOURS,
      eatingOutFrequency: "Bring food from home",
      cookingSetup: "I do",
      cookingTime: "15–30 minutes",
      waterPerDay: "2–5 glasses",
      nutritionGoal: "Stop skipping meals when work gets busy.",
      checkInDay: "Monday",
      checkInChannel: "Email",
    },
    measurements: {
      waist: FIRST_MEASUREMENTS.waistCm,
      hips: FIRST_MEASUREMENTS.hipsCm,
      thigh: FIRST_MEASUREMENTS.thighCm,
      arm: FIRST_MEASUREMENTS.armCm,
    },
  };
}

function requireKnownQuestions(questions: readonly QuestionId[]): void {
  for (const { formId, fieldId } of questions) {
    const form = ONBOARDING_FORMS.find((candidate) => candidate.id === formId);

    if (!form?.fields.some((field) => field.id === fieldId)) {
      throw new Error(`${formId}/${fieldId} is not an onboarding question.`);
    }
  }
}
