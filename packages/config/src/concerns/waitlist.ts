import { z } from "zod";

const environmentBooleanSchema = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");
const waitlistCapSchema = z.coerce.number().int().positive().default(10);
const waitlistCampaignSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

export const waitlistShape = {
  WAITLIST_MODE: environmentBooleanSchema,
  WAITLIST_CAP: waitlistCapSchema,
  WAITLIST_ACTIVE_OFFER_PLAN: z.enum(["all-bundles"]).default("all-bundles"),
  WAITLIST_ACTIVE_CAMPAIGN_SLUG: waitlistCampaignSlugSchema.default(
    "all-bundles-launch-1",
  ),
};

export type WaitlistConfig = z.infer<z.ZodObject<typeof waitlistShape>>;
