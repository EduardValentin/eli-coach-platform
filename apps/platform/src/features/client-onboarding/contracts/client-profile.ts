import { VISITOR_GENDERS } from "@eli-coach-platform/domain/assessment-call";
import { z } from "zod";

export const clientProfileSchema = z.object({
  dateOfBirth: z.iso.date(),
  gender: z.enum(VISITOR_GENDERS),
  country: z.string().min(1),
  phone: z.string().nullable(),
  heightCm: z.number().nullable(),
  startingWeightKg: z.number().nullable(),
  currentWeightKg: z.number().nullable(),
  activityLevel: z.string().nullable(),
  primaryGoal: z.string().nullable(),
  dietaryRestrictions: z.string(),
  clientNotes: z.string().nullable(),
});

export type ClientProfileView = z.infer<typeof clientProfileSchema>;
