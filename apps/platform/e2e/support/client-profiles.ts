import {
  profileFactsOf,
  type OnboardingAnswersByForm,
} from "@eli-coach-platform/domain/client-onboarding";
import type pg from "pg";

type SubmissionRow = {
  answers: OnboardingAnswersByForm;
  progressPhotosConsentedAt: Date | null;
  submittedAt: Date;
};

const SELECT_SUBMISSION = `
  select
    answers,
    progress_photos_consented_at as "progressPhotosConsentedAt",
    submitted_at as "submittedAt"
  from app.client_onboarding_submissions
  where client_id = $1
`;
const INSERT_PROFILE = `
  insert into app.client_profiles (
    client_id, height_cm, activity_level, primary_goal, dietary_restrictions,
    client_notes, progress_photos_consented_at, created_at, updated_at
  )
  values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
`;

export async function recordClientProfile(
  pool: pg.Pool,
  clientId: string,
): Promise<void> {
  const { rows } = await pool.query<SubmissionRow>(SELECT_SUBMISSION, [
    clientId,
  ]);
  const [submission] = rows;

  if (!submission) {
    throw new Error(`Client ${clientId} has no submission to profile.`);
  }

  const facts = profileFactsOf(submission.answers);

  await pool.query(INSERT_PROFILE, [
    clientId,
    facts.heightCm,
    facts.activityLevel,
    facts.primaryGoal,
    facts.dietaryRestrictions,
    facts.clientNotes,
    submission.progressPhotosConsentedAt,
    submission.submittedAt,
  ]);
}
