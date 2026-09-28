import type pg from "pg";

type FormAnswers = Record<string, unknown>;

export type OnboardingDraftRecord = {
  answers: Record<string, FormAnswers>;
  currentFormIndex: number;
};

export type UnitPreferenceRecord = { weightUnit: string; heightUnit: string };

export type SubmissionRecord = {
  answers: Record<string, FormAnswers>;
  specialCategoryConsentedAt: Date | null;
  disclaimerConsentedAt: Date | null;
  progressPhotosConsentedAt: Date | null;
  submittedAt: Date;
};

export type MeasurementRecord = {
  recordedAt: Date;
  weightKg: string;
  waistCm: string;
  hipsCm: string | null;
  thighCm: string | null;
  armCm: string | null;
};

export type ReviewStampsRecord = {
  reviewOpenedAt: Date | null;
  detailsRequestedAt: Date | null;
  detailsAnsweredAt: Date | null;
  answersApprovedAt: Date | null;
};

export type DetailRequestRecord = {
  questionIds: { formId: string; fieldId: string }[];
  note: string;
  askedAt: Date;
  answeredAt: Date | null;
};

const CLIENT_ID_BY_EMAIL = "select id from app.clients where email = $1";

const DRAFT = `
  select answers, current_form_index as "currentFormIndex"
  from app.client_onboarding_drafts
  where client_id = (${CLIENT_ID_BY_EMAIL})
`;

const UNIT_PREFERENCE = `
  select weight_unit as "weightUnit", height_unit as "heightUnit"
  from app.client_unit_preferences
  where client_id = (${CLIENT_ID_BY_EMAIL})
`;

const SUBMISSIONS = `
  select
    answers,
    special_category_consented_at as "specialCategoryConsentedAt",
    disclaimer_consented_at as "disclaimerConsentedAt",
    progress_photos_consented_at as "progressPhotosConsentedAt",
    submitted_at as "submittedAt"
  from app.client_onboarding_submissions
  where client_id = (${CLIENT_ID_BY_EMAIL})
`;

const MEASUREMENTS = `
  select
    recorded_at as "recordedAt",
    weight_kg as "weightKg",
    waist_cm as "waistCm",
    hips_cm as "hipsCm",
    thigh_cm as "thighCm",
    arm_cm as "armCm"
  from app.client_measurements
  where client_id = (${CLIENT_ID_BY_EMAIL})
  order by recorded_at
`;

const ONBOARDING_SUBMITTED_AT = `
  select onboarding_submitted_at as "submittedAt"
  from app.clients
  where email = $1
`;

const REVIEW_STAMPS = `
  select
    review_opened_at as "reviewOpenedAt",
    details_requested_at as "detailsRequestedAt",
    details_answered_at as "detailsAnsweredAt",
    answers_approved_at as "answersApprovedAt"
  from app.clients
  where email = $1
`;

const DETAIL_REQUESTS = `
  select
    question_ids as "questionIds",
    note,
    asked_at as "askedAt",
    answered_at as "answeredAt"
  from app.client_onboarding_detail_requests
  where client_id = (${CLIENT_ID_BY_EMAIL})
  order by asked_at
`;

export class OnboardingRecords {
  constructor(
    private readonly pool: pg.Pool,
    private readonly email: string,
  ) {}

  private async rows<Row extends pg.QueryResultRow>(
    statement: string,
  ): Promise<Row[]> {
    const { rows } = await this.pool.query<Row>(statement, [this.email]);

    return rows;
  }

  async draft(): Promise<OnboardingDraftRecord | null> {
    const [row] = await this.rows<OnboardingDraftRecord>(DRAFT);

    return row ?? null;
  }

  async unitPreference(): Promise<UnitPreferenceRecord | null> {
    const [row] = await this.rows<UnitPreferenceRecord>(UNIT_PREFERENCE);

    return row ?? null;
  }

  async submissions(): Promise<SubmissionRecord[]> {
    return this.rows<SubmissionRecord>(SUBMISSIONS);
  }

  async measurements(): Promise<MeasurementRecord[]> {
    return this.rows<MeasurementRecord>(MEASUREMENTS);
  }

  async onboardingSubmittedAt(): Promise<Date | null> {
    const [row] = await this.rows<{ submittedAt: Date | null }>(
      ONBOARDING_SUBMITTED_AT,
    );

    return row?.submittedAt ?? null;
  }

  async reviewStamps(): Promise<ReviewStampsRecord | null> {
    const [row] = await this.rows<ReviewStampsRecord>(REVIEW_STAMPS);

    return row ?? null;
  }

  async detailRequests(): Promise<DetailRequestRecord[]> {
    return this.rows<DetailRequestRecord>(DETAIL_REQUESTS);
  }
}
