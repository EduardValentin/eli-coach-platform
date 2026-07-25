import { z } from "zod";

export const waitlistJoinRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320, "Please enter an email address under 320 characters.")
    .email("Please enter a valid email address."),
});

export const waitlistOfferSchema = z.object({
  plan: z.enum(["all-bundles"]),
  campaignSlug: z.string().min(1).max(96),
});

export const waitlistSchema = z.object({
  enabled: z.boolean(),
  cap: z.number().int().positive(),
  offer: waitlistOfferSchema,
  availability: z.enum(["available", "limited", "closed"]).nullable().optional(),
  spotsRemaining: z.number().int().min(0).nullable(),
});

export const waitlistJoinSuccessSchema = z.object({
  success: z.literal(true),
});

export const waitlistJoinErrorCodeSchema = z.enum([
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
export type WaitlistOffer = z.infer<typeof waitlistOfferSchema>;
export type WaitlistJoinRequest = z.infer<typeof waitlistJoinRequestSchema>;
export type WaitlistJoinErrorCode = z.infer<typeof waitlistJoinErrorCodeSchema>;
export type WaitlistJoinResponse = z.infer<typeof waitlistJoinResponseSchema>;
