export const TURNSTILE_RESPONSE_FIELD = "cf-turnstile-response";
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
