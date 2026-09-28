import { VISITOR_GENDERS } from "@eli-coach-platform/domain/assessment-call";
import {
  ONBOARDING_FORM_IDS,
  type OnboardingConsent,
} from "@eli-coach-platform/domain/client-onboarding";
import {
  HEIGHT_UNITS,
  WEIGHT_UNITS,
} from "@eli-coach-platform/domain/unit-preference";
import { z } from "zod";

const ANSWER_MAX_LENGTH = 2000;
const CHOICE_MAX_LENGTH = 200;
const CHOICES_MAX_COUNT = 50;
const FIELD_ID_MAX_LENGTH = 64;

const ONBOARDING_CONSENTS = [
  "special-category",
  "disclaimer",
] as const satisfies readonly OnboardingConsent[];

const formIdSchema = z.enum(ONBOARDING_FORM_IDS);

const onboardingAnswerSchema = z.union([
  z.string().max(ANSWER_MAX_LENGTH),
  z.array(z.string().max(CHOICE_MAX_LENGTH)).max(CHOICES_MAX_COUNT),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const answersByFormSchema = z.record(
  formIdSchema,
  z.record(z.string().min(1).max(FIELD_ID_MAX_LENGTH), onboardingAnswerSchema),
);

export const consentsSchema = z.object({
  specialCategoryAt: z.iso.datetime().nullable(),
  disclaimerAt: z.iso.datetime().nullable(),
  progressPhotosAt: z.iso.datetime().nullable(),
});

export type OnboardingConsentInstants = z.infer<typeof consentsSchema>;

export const saveDraftRequestSchema = z.object({
  formId: formIdSchema,
  answers: answersByFormSchema,
  currentFormIndex: z.number().int().min(0),
  consents: consentsSchema,
});

export const submitRequestSchema = z.object({
  answers: answersByFormSchema,
  consents: consentsSchema,
});

export const unitPreferenceRequestSchema = z.object({
  weightUnit: z.enum(WEIGHT_UNITS),
  heightUnit: z.enum(HEIGHT_UNITS),
});

export const onboardingPageSchema = z.object({
  clientId: z.string().min(1),
  formIds: z.array(formIdSchema).min(1),
  gender: z.enum(VISITOR_GENDERS),
  manualScreening: z.boolean(),
  draft: z.object({
    answers: answersByFormSchema,
    currentFormIndex: z.number().int().min(0),
    consents: consentsSchema,
    updatedAt: z.iso.datetime(),
  }),
  unitPreference: unitPreferenceRequestSchema,
  resumed: z.boolean(),
});

export type OnboardingPage = z.infer<typeof onboardingPageSchema>;

export const submissionProblemsSchema = z.object({
  problems: z
    .array(
      z.object({
        formId: formIdSchema,
        fieldId: z.string().min(1),
        message: z.string().min(1),
      }),
    )
    .min(1),
});

export const missingConsentSchema = z.object({
  consent: z.enum(ONBOARDING_CONSENTS),
});

export const submissionAcceptedSchema = z.object({
  redirectTo: z.string().regex(/^\/(?!\/)/),
});

export const onboardingRefusalSchema = z.object({
  error: z.enum(["not-on-journey", "already-submitted"]),
});
