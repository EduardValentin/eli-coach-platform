import { z } from "zod";

import {
  clientPreferencesSchema,
  coachingFactsSchema,
  profileIdentitySchema,
  sharedCoachingFactsSchema,
} from "./client-profile";

export const ownClientProfileSchema = z.object({
  identity: profileIdentitySchema,
  coaching: coachingFactsSchema.nullable(),
  settings: clientPreferencesSchema,
  avatarUrl: z.string().nullable(),
  startingWeightKg: z.number().nullable(),
  currentWeightKg: z.number().nullable(),
});

export type OwnClientProfileView = z.infer<typeof ownClientProfileSchema>;

export const ownProfileRequestSchema = z.object({
  facts: sharedCoachingFactsSchema,
});
