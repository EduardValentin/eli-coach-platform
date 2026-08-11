import { z } from "zod";

export const TURNSTILE_RESPONSE_FIELD = "cf-turnstile-response";
export const STORE_ACQUISITION_TURNSTILE_ACTION = "store_acquisition";
export const WAITLIST_TURNSTILE_ACTION = "waitlist_join";

const staticBotDetectionConfigSchema = z.object({
  provider: z.literal("static"),
  token: z.string().min(1),
});

const turnstileBotDetectionConfigSchema = z.object({
  provider: z.literal("turnstile"),
  siteKey: z.string().min(1),
});

export const botDetectionConfigSchema = z.discriminatedUnion("provider", [
  staticBotDetectionConfigSchema,
  turnstileBotDetectionConfigSchema,
]);

export type BotDetectionConfig = z.infer<typeof botDetectionConfigSchema>;

// Not part of the wire payload: the browser's view of a config it may not have
// fetched yet, so it stays a plain type rather than a schema.
export type BotDetectionRuntimeState =
  | {
      config: null;
      status: "loading" | "unavailable";
    }
  | {
      config: BotDetectionConfig;
      status: "ready";
    };
