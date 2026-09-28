import { VISITOR_GENDERS } from "@eli-coach-platform/domain/assessment-call";
import {
  ONBOARDING_FORM_IDS,
  type OnboardingConsent,
} from "@eli-coach-platform/domain/client-onboarding";
import {
  HEIGHT_UNITS,
  WEIGHT_UNITS,
  type UnitPreferenceSnapshot,
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

const formAnswersSchema = z.record(
  z.string().min(1).max(FIELD_ID_MAX_LENGTH),
  onboardingAnswerSchema,
);

export const answersByFormSchema = z.record(formIdSchema, formAnswersSchema);

export const askedAnswersSchema = z.partialRecord(
  formIdSchema,
  formAnswersSchema,
);

export type AskedAnswers = z.infer<typeof askedAnswersSchema>;

export const questionIdSchema = z.object({
  formId: formIdSchema,
  fieldId: z.string().min(1).max(FIELD_ID_MAX_LENGTH),
});

export type QuestionId = z.infer<typeof questionIdSchema>;

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

export type SaveDraftRequest = z.infer<typeof saveDraftRequestSchema>;

export const submitRequestSchema = z.object({
  answers: answersByFormSchema,
  consents: consentsSchema,
});

export type SubmitRequest = z.infer<typeof submitRequestSchema>;

export const unitPreferenceSchema = z.object({
  weightUnit: z.enum(WEIGHT_UNITS),
  heightUnit: z.enum(HEIGHT_UNITS),
}) satisfies z.ZodType<UnitPreferenceSnapshot>;

export const onboardingWizardPageSchema = z.object({
  mode: z.literal("wizard"),
  clientId: z.string().min(1),
  formIds: z.array(formIdSchema).min(1),
  gender: z.enum(VISITOR_GENDERS),
  manualScreening: z.boolean(),
  draft: z.object({
    answers: answersByFormSchema,
    currentFormIndex: z.number().int().min(0),
    consents: consentsSchema,
    updatedAt: z.iso.datetime().nullable(),
  }),
  unitPreference: unitPreferenceSchema,
  resumed: z.boolean(),
});

export type OnboardingWizardPage = z.infer<typeof onboardingWizardPageSchema>;

export const onboardingAnswerPageSchema = z.object({
  mode: z.literal("answer"),
  request: z.object({
    note: z.string().min(1),
    fields: z.array(questionIdSchema).min(1),
  }),
  answers: askedAnswersSchema,
  unitPreference: unitPreferenceSchema,
});

export type OnboardingAnswerPage = z.infer<typeof onboardingAnswerPageSchema>;

export const onboardingPageSchema = z.discriminatedUnion("mode", [
  onboardingWizardPageSchema,
  onboardingAnswerPageSchema,
]);

export type OnboardingPage = z.infer<typeof onboardingPageSchema>;

export const answerDetailsRequestSchema = z.object({
  answers: askedAnswersSchema,
});

export type AnswerDetailsRequest = z.infer<typeof answerDetailsRequestSchema>;

export const openRequestSummarySchema = z
  .object({ note: z.string().min(1) })
  .nullable();

export type OpenRequestSummary = z.infer<typeof openRequestSummarySchema>;

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

export type SubmissionProblem = z.infer<
  typeof submissionProblemsSchema
>["problems"][number];

export const missingConsentSchema = z.object({
  consent: z.enum(ONBOARDING_CONSENTS),
});

export const submissionAcceptedSchema = z.object({
  redirectTo: z.string().regex(/^\/(?!\/)/),
});

export const onboardingRefusalSchema = z.object({
  error: z.enum(["not-on-journey", "already-submitted", "no-open-request"]),
});
