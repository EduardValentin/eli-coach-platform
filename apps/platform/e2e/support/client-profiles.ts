import type { OnboardingAnswersByForm } from "@eli-coach-platform/domain/client-onboarding";
import type pg from "pg";

export type ProfileFacts = {
  heightCm: number | null;
  startingWeightKg: number | null;
  activityLevel: string | null;
  primaryGoal: string | null;
  dietaryRestrictions: string;
  clientNotes: string | null;
};

type ProfileIdentity = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  country: string;
  phone: string | null;
};

type SubmissionRow = {
  answers: OnboardingAnswersByForm;
  submittedAt: Date;
};

const NO_RESTRICTIONS = "No restrictions";
const SOMETHING_ELSE = "Something else";
const HAS_ALLERGIES = "Yes";
const NO_DIETARY_RESTRICTIONS = "None";
const RESTRICTION_SEPARATOR = ", ";

const SELECT_IDENTITY = `
  select
    first_name as "firstName",
    last_name as "lastName",
    email,
    to_char(date_of_birth, 'YYYY-MM-DD') as "dateOfBirth",
    gender,
    country,
    phone
  from app.clients
  where id = $1
`;
const SELECT_SUBMISSION = `
  select answers, submitted_at as "submittedAt"
  from app.client_onboarding_submissions
  where client_id = $1
`;
const SELECT_LATEST_WEIGHT = `
  select weight_kg as "weightKg"
  from app.client_measurements
  where client_id = $1
  order by recorded_at desc
  limit 1
`;
const INSERT_PROFILE = `
  insert into app.client_profiles (
    client_id, first_name, last_name, email, date_of_birth, gender, country,
    phone, height_cm, starting_weight_kg, current_weight_kg, activity_level,
    primary_goal, dietary_restrictions, client_notes, created_at, updated_at
  )
  values (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16
  )
`;

function numberOf(answer: unknown): number | null {
  return typeof answer === "number" ? answer : null;
}

function textOf(answer: unknown): string | null {
  return typeof answer === "string" ? answer : null;
}

function trimmedTextOf(answer: unknown): string | null {
  return textOf(answer)?.trim() || null;
}

function eatingStyleRestriction(
  nutrition: Record<string, unknown>,
): string | null {
  const eatingStyle = textOf(nutrition["eatingStyle"]);

  if (eatingStyle === SOMETHING_ELSE) {
    return trimmedTextOf(nutrition["eatingStyleOther"]) ?? SOMETHING_ELSE;
  }

  return eatingStyle === NO_RESTRICTIONS ? null : eatingStyle;
}

function allergiesRestriction(
  nutrition: Record<string, unknown>,
): string | null {
  return textOf(nutrition["allergiesOrIntolerances"]) === HAS_ALLERGIES
    ? trimmedTextOf(nutrition["allergiesOrIntolerancesList"])
    : null;
}

export function profileFactsOf(answers: OnboardingAnswersByForm): ProfileFacts {
  const goals: Record<string, unknown> = answers["goal-availability"] ?? {};
  const nutrition: Record<string, unknown> =
    answers["nutrition-lifestyle"] ?? {};
  const restrictions = [
    eatingStyleRestriction(nutrition),
    allergiesRestriction(nutrition),
  ].filter((restriction) => restriction !== null);

  return {
    heightCm: numberOf(goals["height"]),
    startingWeightKg: numberOf(goals["weight"]),
    activityLevel: textOf(goals["lifestyleActivityLevel"]),
    primaryGoal: textOf(goals["primaryGoal"]),
    dietaryRestrictions:
      restrictions.length > 0
        ? restrictions.join(RESTRICTION_SEPARATOR)
        : NO_DIETARY_RESTRICTIONS,
    clientNotes: trimmedTextOf(goals["additionalInfo"]),
  };
}

async function onlyRow<Row extends pg.QueryResultRow>(
  pool: pg.Pool,
  statement: string,
  clientId: string,
): Promise<Row | null> {
  const { rows } = await pool.query<Row>(statement, [clientId]);

  return rows[0] ?? null;
}

export async function recordClientProfile(
  pool: pg.Pool,
  clientId: string,
): Promise<void> {
  const identity = await onlyRow<ProfileIdentity>(
    pool,
    SELECT_IDENTITY,
    clientId,
  );
  const submission = await onlyRow<SubmissionRow>(
    pool,
    SELECT_SUBMISSION,
    clientId,
  );

  if (!identity || !submission) {
    throw new Error(`Client ${clientId} has no submission to profile.`);
  }

  const latest = await onlyRow<{ weightKg: string }>(
    pool,
    SELECT_LATEST_WEIGHT,
    clientId,
  );
  const facts = profileFactsOf(submission.answers);

  await pool.query(INSERT_PROFILE, [
    clientId,
    identity.firstName,
    identity.lastName,
    identity.email,
    identity.dateOfBirth,
    identity.gender,
    identity.country,
    identity.phone,
    facts.heightCm,
    facts.startingWeightKg,
    latest ? Number(latest.weightKg) : null,
    facts.activityLevel,
    facts.primaryGoal,
    facts.dietaryRestrictions,
    facts.clientNotes,
    submission.submittedAt,
  ]);
}
