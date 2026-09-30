import {
  profileFactsOf,
  type OnboardingAnswersByForm,
} from "@eli-coach-platform/domain/client-onboarding";
import type pg from "pg";

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
