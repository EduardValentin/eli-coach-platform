import { z } from "zod";

export const waitlistJoinRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320, "Please enter an email address under 320 characters.")
    .email("Please enter a valid email address."),
});

const waitlistOfferSchema = z.object({
  plan: z.enum(["all-bundles"]),
  campaignSlug: z.string().min(1).max(96),
});

const waitlistAvailabilitySchema = z.enum(["available", "limited", "closed"]);

export const waitlistSchema = z.object({
  enabled: z.boolean(),
  offer: waitlistOfferSchema,
  availability: waitlistAvailabilitySchema.nullable(),
});

export const waitlistJoinSuccessSchema = z.object({
  success: z.literal(true),
});

const waitlistJoinErrorCodeSchema = z.enum([
  "invalid_email",
  "email_too_long",
  "bot_verification_failed",
  "server_error",
]);

export const waitlistJoinErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: waitlistJoinErrorCodeSchema,
    message: z.string().min(1),
  }),
});

export const waitlistJoinResponseSchema = z.discriminatedUnion("success", [
  waitlistJoinSuccessSchema,
  waitlistJoinErrorSchema,
]);

export type Waitlist = z.infer<typeof waitlistSchema>;
export type WaitlistJoinErrorCode = z.infer<typeof waitlistJoinErrorCodeSchema>;
export type WaitlistJoinResponse = z.infer<typeof waitlistJoinResponseSchema>;
