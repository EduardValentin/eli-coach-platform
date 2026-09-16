import { z } from "zod";

import { isProductionRuntime, type AppConfig } from "./app";

const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000BB";
const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
export const TURNSTILE_TEST_RESPONSE_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const turnstileTestKeyPattern = /^[123]x0+[A-Z][A-Z]$/;

export const botDetectionShape = {
  BOT_DETECTION_PROVIDER: z.enum(["turnstile", "static"]).default("static"),
  TURNSTILE_SITE_KEY: z.string().min(1).default(TURNSTILE_TEST_SITE_KEY),
  TURNSTILE_SECRET_KEY: z.string().min(1).default(TURNSTILE_TEST_SECRET_KEY),
  TURNSTILE_SITEVERIFY_URL: z.url().default(TURNSTILE_SITEVERIFY_URL),
  TURNSTILE_STATIC_TOKEN: z.string().min(1).default(TURNSTILE_TEST_RESPONSE_TOKEN),
};

export type BotDetectionSettings = z.infer<z.ZodObject<typeof botDetectionShape>>;

export function refineBotDetection(
  environment: BotDetectionSettings & AppConfig,
  context: z.RefinementCtx,
): void {
  if (!isProductionRuntime(environment)) {
    return;
  }

  if (environment.BOT_DETECTION_PROVIDER === "static") {
    context.addIssue({
      code: "custom",
      message: "BOT_DETECTION_PROVIDER must be turnstile in a production runtime.",
      path: ["BOT_DETECTION_PROVIDER"],
    });
  }

  if (
    !turnstileTestKeyPattern.test(environment.TURNSTILE_SITE_KEY) &&
    !turnstileTestKeyPattern.test(environment.TURNSTILE_SECRET_KEY)
  ) {
    return;
  }

  context.addIssue({
    code: "custom",
    message: "Production Turnstile configuration requires real Cloudflare keys.",
    path: ["TURNSTILE_SITE_KEY"],
  });
}
