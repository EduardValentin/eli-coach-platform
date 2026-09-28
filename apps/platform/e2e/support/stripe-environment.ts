import Stripe from "stripe";

export type StripeTestEnvironment = {
  secretKey: string;
  webhookSigningSecret: string;
};

const TEST_MODE_SECRET_KEY = /^(sk|rk)_test_\w+$/;
const WEBHOOK_SIGNING_SECRET = /^whsec_\w+$/;

export type StripeTestEnvironmentReading =
  { environment: StripeTestEnvironment } | { problem: string };

export function readStripeTestEnvironment(): StripeTestEnvironmentReading {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const webhookSigningSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET ?? "";

  if (!TEST_MODE_SECRET_KEY.test(secretKey)) {
    return {
      problem:
        "STRIPE_SECRET_KEY in the repo root .env.e2e must be a Stripe test-mode " +
        "key (sk_test_… or rk_test_…) of the account the app's checkout is " +
        "configured for. The e2e suite pays on the hosted Checkout with it.",
    };
  }

  if (!WEBHOOK_SIGNING_SECRET.test(webhookSigningSecret)) {
    return {
      problem:
        "STRIPE_WEBHOOK_SIGNING_SECRET in the repo root .env.e2e must be a " +
        "whsec_… value. The suite's dev server verifies the webhook deliveries " +
        "the journeys sign with it; make one up with whsec_ and random hex.",
    };
  }

  return { environment: { secretKey, webhookSigningSecret } };
}

export function requireStripeTestEnvironment(): StripeTestEnvironment {
  const reading = readStripeTestEnvironment();

  if ("problem" in reading) {
    throw new Error(reading.problem);
  }

  return reading.environment;
}

export function createStripeTestClient(): Stripe {
  return new Stripe(requireStripeTestEnvironment().secretKey);
}
