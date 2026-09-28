import { ONBOARDING_FORM_IDS } from "@eli-coach-platform/domain/client-onboarding";
import { z } from "zod";

import { questionIdSchema } from "./onboarding";

const NOTE_MAX_LENGTH = 2000;
const QUESTIONS_MAX_COUNT = 200;

const REVIEW_STAGES = [
  "awaiting-review",
  "in-review",
  "needs-details",
  "approved",
] as const;

export type ReviewStage = (typeof REVIEW_STAGES)[number];

const CYCLE_MODES = [
  "phase-based",
  "symptom-based",
  "manual",
  "not-applicable",
] as const;

const reviewAnswerSchema = z.object({
  fieldId: z.string().min(1),
  label: z.string().min(1),
  value: z.string().nullable(),
  flagged: z.boolean(),
});

export type ReviewAnswer = z.infer<typeof reviewAnswerSchema>;

const reviewFormSchema = z.object({
  formId: z.enum(ONBOARDING_FORM_IDS),
  title: z.string().min(1),
  answered: z.number().int().min(0),
  total: z.number().int().min(0),
  answers: z.array(reviewAnswerSchema),
});

export type ReviewForm = z.infer<typeof reviewFormSchema>;

const openDetailRequestSchema = z.object({
  note: z.string().min(1),
  askedAt: z.iso.datetime(),
  questions: z.array(questionIdSchema).min(1),
});

export type OpenDetailRequest = z.infer<typeof openDetailRequestSchema>;

const measurementRowSchema = z.object({
  recordedAt: z.iso.datetime(),
  weightKg: z.number(),
  waistCm: z.number(),
  hipsCm: z.number().nullable(),
  thighCm: z.number().nullable(),
  armCm: z.number().nullable(),
});

export type MeasurementRow = z.infer<typeof measurementRowSchema>;

const submittedReviewSchema = z.object({
  stage: z.enum(REVIEW_STAGES),
  screening: z.object({
    outcome: z.enum(["manual", "cleared", "needs-review", "pending"]),
    yesCount: z.number().int().min(0),
  }),
  withholdsNutritionAdvice: z.boolean(),
  pregnancyContext: z.boolean(),
  cycleMode: z.enum(CYCLE_MODES).nullable(),
  checkInDay: z.string().nullable(),
  checkInChannel: z.string().nullable(),
  forms: z.array(reviewFormSchema),
  openRequest: openDetailRequestSchema.nullable(),
});

export type SubmittedReview = z.infer<typeof submittedReviewSchema>;

export const onboardingReviewSchema = z.object({
  clientId: z.string().min(1),
  submitted: submittedReviewSchema.nullable(),
  measurements: z.array(measurementRowSchema),
  statedHeightCm: z.number().nullable(),
});

export type OnboardingReviewView = z.infer<typeof onboardingReviewSchema>;

export const clientIdSchema = z.uuid();

export const reviewTargetSchema = z.object({ clientId: clientIdSchema });

export type ReviewTarget = z.infer<typeof reviewTargetSchema>;

export const detailRequestSchema = z.object({
  clientId: clientIdSchema,
  questions: z.array(questionIdSchema).max(QUESTIONS_MAX_COUNT),
  note: z.string().max(NOTE_MAX_LENGTH),
});

export type DetailRequestBody = z.infer<typeof detailRequestSchema>;

export const reviewActionAcceptedSchema = z.object({
  outcome: z.enum(["opened", "already-open", "requested", "approved"]),
});

export const reviewActionRefusalSchema = z.object({
  error: z.enum([
    "not-found",
    "not-submitted",
    "approved",
    "not-in-review",
    "not-reviewable",
    "invalid",
  ]),
});

export type ReviewActionRefusal = z.infer<
  typeof reviewActionRefusalSchema
>["error"];
