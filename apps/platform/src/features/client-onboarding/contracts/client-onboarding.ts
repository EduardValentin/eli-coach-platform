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
const NAME_MAX_LENGTH = 100;

// One definition per measurable field, shared with the wizard so the bound a
// coach is shown, the bound her typing is held to, and the bound the server
// enforces cannot drift apart.
//
// The calorie ceiling is above anything this app can itself compute: the
// heaviest, most active client at the fastest permitted rate of gain works out
// near 11,300 kcal, and a lower cap would have the wizard reject a figure its
// own slider produced. It is a typo guard, not a clinical limit.
const FIELD_RANGES = {
  dailyCalories: { max: 12000, min: 800 },
  heightCm: { max: 250, min: 100 },
  macroPercent: { max: 100, min: 0 },
  targetWeightKg: { max: 300, min: 30 },
  weightKg: { max: 300, min: 30 },
} as const;

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
  firstName: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  lastName: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  email: z.string().trim().max(320).email(),
  // Stored as a date rather than an age, which would go stale in the record.
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD form.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Not a real date."),
  sex: z.enum(GENDERS),
  heightCm: z.number().min(FIELD_RANGES.heightCm.min).max(FIELD_RANGES.heightCm.max),
  weightKg: z.number().min(FIELD_RANGES.weightKg.min).max(FIELD_RANGES.weightKg.max),
  activityLevel: z.enum(ACTIVITY_LEVELS),
  dietaryRestrictions: z.string().trim().max(2000).nullable().optional(),
  goalType: z.enum(GOAL_TYPES),
  targetWeightKg: z.number().min(FIELD_RANGES.targetWeightKg.min).max(FIELD_RANGES.targetWeightKg.max),
  coachNotes: z.string().trim().max(2000).nullable().optional(),
  dailyCalories: z.number().int().min(FIELD_RANGES.dailyCalories.min).max(FIELD_RANGES.dailyCalories.max),
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

export { FIELD_RANGES, MAX_AGE_YEARS, MIN_AGE_YEARS, NAME_MAX_LENGTH };
