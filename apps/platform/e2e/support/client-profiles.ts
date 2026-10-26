import type pg from "pg";

const RECORD_SUBMITTED_PHOTO_CONSENT = `
  update app.client_profiles
  set progress_photos_consented_at = submission.progress_photos_consented_at
  from app.client_onboarding_submissions as submission
  where submission.client_id = client_profiles.client_id
    and client_profiles.client_id = $1
    and submission.progress_photos_consented_at is not null
`;

export async function recordSubmittedPhotoConsent(
  pool: pg.Pool,
  clientId: string,
): Promise<void> {
  await pool.query(RECORD_SUBMITTED_PHOTO_CONSENT, [clientId]);
}
