import { E2E_APP_URL } from "./e2e-app";
import { EMAIL_CAPTURE_URL } from "./email-capture";
import {
  MISSING_E2E_ENVIRONMENT_FILE,
  hasE2eEnvironmentFile,
  loadE2eEnvironment,
} from "./env";
import {
  readStripeTestEnvironment,
  type StripeTestEnvironmentReading,
} from "./stripe-environment";

export type WebServerLaunch = {
  command: string;
  env: Record<string, string>;
};

const REPORT_ENVIRONMENT_PROBLEM_COMMAND =
  'node -e "console.error(process.env.E2E_ENVIRONMENT_PROBLEM); process.exit(1)"';

export function readWebServerEnvironment(): StripeTestEnvironmentReading {
  if (!hasE2eEnvironmentFile()) {
    return { problem: MISSING_E2E_ENVIRONMENT_FILE };
  }

  loadE2eEnvironment();
  return readStripeTestEnvironment();
}

export function webServerLaunchFor(
  reading: StripeTestEnvironmentReading,
): WebServerLaunch {
  if ("problem" in reading) {
    return {
      command: REPORT_ENVIRONMENT_PROBLEM_COMMAND,
      env: { E2E_ENVIRONMENT_PROBLEM: reading.problem },
    };
  }

  return {
    command: "pnpm dev:e2e",
    env: {
      IDENTITY_PROVIDER: "clerk",
      PAYMENTS_PROVIDER: "stripe",
      PRODUCT_EMAIL_PROVIDER: "resend",
      PUBLIC_APP_URL: E2E_APP_URL,
      RESEND_API_KEY: "re_e2e_email_capture",
      RESEND_BASE_URL: EMAIL_CAPTURE_URL,
      STRIPE_SECRET_KEY: reading.environment.secretKey,
      STRIPE_WEBHOOK_SIGNING_SECRET: reading.environment.webhookSigningSecret,
    },
  };
}
