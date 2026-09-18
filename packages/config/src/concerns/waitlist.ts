import { z } from "zod";

const waitlistCampaignSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

export const waitlistShape = {
  WAITLIST_ACTIVE_OFFER_PLAN: z.enum(["all-bundles"]).default("all-bundles"),
  WAITLIST_ACTIVE_CAMPAIGN_SLUG: waitlistCampaignSlugSchema.default(
    "all-bundles-launch-1",
  ),
};

export type WaitlistConfig = z.infer<z.ZodObject<typeof waitlistShape>>;
