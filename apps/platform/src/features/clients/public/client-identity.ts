import { VISITOR_GENDERS } from "@eli-coach-platform/domain/assessment-call";
import type { ClientIdentityProblems } from "@eli-coach-platform/domain/client";
import { z } from "zod";

const FIELD_MAX_LENGTH = 200;

export const ownClientIdentityRequestSchema = z.object({
  firstName: z.string().max(FIELD_MAX_LENGTH),
  lastName: z.string().max(FIELD_MAX_LENGTH),
  dateOfBirth: z.string().max(FIELD_MAX_LENGTH),
  country: z.string().max(FIELD_MAX_LENGTH),
  phoneCountry: z.string().max(FIELD_MAX_LENGTH).optional(),
  phoneNumber: z.string().max(FIELD_MAX_LENGTH).optional(),
});

export type OwnClientIdentityRequest = z.infer<
  typeof ownClientIdentityRequestSchema
>;

export const coachClientIdentityRequestSchema =
  ownClientIdentityRequestSchema.extend({ gender: z.enum(VISITOR_GENDERS) });

const clientIdentityProblemsSchema = z.object({
  firstName: z.enum(["missing", "too-long"]).optional(),
  lastName: z.enum(["missing", "too-long"]).optional(),
  phone: z.enum(["invalid"]).optional(),
  dateOfBirth: z.enum(["impossible", "too-young"]).optional(),
  country: z.enum(["invalid"]).optional(),
}) satisfies z.ZodType<ClientIdentityProblems>;

export const clientIdentityProblemsAnswerSchema = z.object({
  problems: clientIdentityProblemsSchema,
});

export const clientIdentityRefusalSchema = z.object({
  error: z.enum(["not-found", "not-on-journey", "ended"]),
});
