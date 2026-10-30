import {
  CLIENT_GENDERS,
  type ClientIdentityProblems,
} from "~/bounded-contexts/clients/clients/domain/client";
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
  ownClientIdentityRequestSchema.extend({ gender: z.enum(CLIENT_GENDERS) });

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

export const clientIdentitySavedAnswerSchema = z.object({
  status: z.literal("saved"),
});

export const clientIdentityRefusalSchema = z.object({
  error: z.enum(["not-found", "not-on-journey", "ended"]),
});
