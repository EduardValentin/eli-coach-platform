import { z } from "zod";

export const GENDERS = ["FEMALE", "MALE"] as const;
export const ACTIVITY_LEVELS = [
  "SEDENTARY",
  "LIGHTLY_ACTIVE",
  "MODERATELY_ACTIVE",
  "VERY_ACTIVE",
] as const;
export const GOAL_TYPES = [
  "MUSCLE_BUILDING",
  "FAT_LOSS",
  "STRENGTH",
  "RECOMPOSITION",
  "MAINTENANCE",
  "CUSTOM",
] as const;

const MIN_AGE_YEARS = 16;
const MAX_AGE_YEARS = 100;

export const macroSplitSchema = z
  .object({
    proteinPercent: z.number().int().min(0).max(100),
    carbsPercent: z.number().int().min(0).max(100),
    fatsPercent: z.number().int().min(0).max(100),
  })
  .refine(
    (split) =>
      split.proteinPercent + split.carbsPercent + split.fatsPercent === 100,
    { message: "The macro split must add up to 100%.", path: ["proteinPercent"] },
  );

export const onboardClientRequestSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(128),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().max(320).email(),
  // Stored as a date rather than an age, which would go stale in the record.
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD form.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Not a real date."),
  sex: z.enum(GENDERS),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(300),
  activityLevel: z.enum(ACTIVITY_LEVELS),
  dietaryRestrictions: z.string().trim().max(2000).nullable().optional(),
  goalType: z.enum(GOAL_TYPES),
  targetWeightKg: z.number().min(30).max(300),
  coachNotes: z.string().trim().max(2000).nullable().optional(),
  dailyCalories: z.number().int().min(800).max(6000),
  macroSplit: macroSplitSchema,
});

export const onboardClientSuccessSchema = z.object({
  success: z.literal(true),
  clientId: z.string(),
  invitationExpiresAt: z.string(),
  replacedPendingInvitation: z.boolean(),
});

export const onboardClientErrorCodeSchema = z.enum([
  "validation_failed",
  "already_a_client",
  "idempotency_conflict",
  "invitation_email_failed",
  "server_error",
]);

export const onboardClientIssueSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const onboardClientErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: onboardClientErrorCodeSchema,
    message: z.string().min(1),
    issues: z.array(onboardClientIssueSchema).optional(),
  }),
});

export const onboardClientResponseSchema = z.discriminatedUnion("success", [
  onboardClientSuccessSchema,
  onboardClientErrorSchema,
]);

export type OnboardClientRequest = z.infer<typeof onboardClientRequestSchema>;
export type OnboardClientResponse = z.infer<typeof onboardClientResponseSchema>;
export type OnboardClientErrorCode = z.infer<
  typeof onboardClientErrorCodeSchema
>;
export type OnboardClientIssue = z.infer<typeof onboardClientIssueSchema>;

export { MAX_AGE_YEARS, MIN_AGE_YEARS };
