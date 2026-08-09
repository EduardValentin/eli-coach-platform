export const TURNSTILE_RESPONSE_FIELD = "cf-turnstile-response";
export const STORE_ACQUISITION_TURNSTILE_ACTION = "store_acquisition";
export const WAITLIST_TURNSTILE_ACTION = "waitlist_join";

export type BotDetectionConfig =
  | {
      provider: "static";
      token: string;
    }
  | {
      provider: "turnstile";
      siteKey: string;
    };

export type BotDetectionRuntimeState =
  | {
      config: null;
      status: "loading" | "unavailable";
    }
  | {
      config: BotDetectionConfig;
      status: "ready";
    };

export function isBotDetectionConfig(value: unknown): value is BotDetectionConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (
    "provider" in value &&
    value.provider === "static" &&
    "token" in value
  ) {
    return typeof value.token === "string" && value.token.length > 0;
  }

  return (
    "provider" in value &&
    value.provider === "turnstile" &&
    "siteKey" in value &&
    typeof value.siteKey === "string" &&
    value.siteKey.length > 0
  );
}
