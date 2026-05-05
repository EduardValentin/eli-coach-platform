import { z } from "zod";

export const waitlistJoinRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320, "Please enter an email address under 320 characters.")
    .email("Please enter a valid email address."),
});

export const waitlistSnapshotSchema = z.object({
  enabled: z.boolean(),
  cap: z.number().int().positive(),
  spotsRemaining: z.number().int().min(0).nullable(),
});

export const waitlistJoinSuccessSchema = z.object({
  success: z.literal(true),
  pricing: z.enum(["reduced", "regular"]),
  spotsRemaining: z.number().int().min(0),
});

export const waitlistJoinErrorCodeSchema = z.enum([
  "invalid_email",
  "email_too_long",
  "already_registered",
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

export type WaitlistSnapshot = z.infer<typeof waitlistSnapshotSchema>;
export type WaitlistJoinRequest = z.infer<typeof waitlistJoinRequestSchema>;
export type WaitlistJoinErrorCode = z.infer<typeof waitlistJoinErrorCodeSchema>;
export type WaitlistJoinResponse = z.infer<typeof waitlistJoinResponseSchema>;
