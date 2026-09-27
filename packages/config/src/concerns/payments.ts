import { z } from "zod";

import { isProductionRuntime, type AppConfig } from "./app";

const PLACEHOLDER_SECRET = "replace-me";

export const paymentsShape = {
  PAYMENTS_PROVIDER: z.enum(["memory", "stripe"]).default("memory"),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),
  STRIPE_API_BASE_URL: z.url({ protocol: /^https?$/ }).optional(),
};

export type PaymentsConfig = z.infer<z.ZodObject<typeof paymentsShape>>;

type StripeSecretName = "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SIGNING_SECRET";

const STRIPE_SECRET_NAMES: readonly StripeSecretName[] = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SIGNING_SECRET",
];

export function refinePayments(
  environment: PaymentsConfig & AppConfig,
  context: z.RefinementCtx,
): void {
  if (environment.PAYMENTS_PROVIDER === "stripe") {
    for (const name of STRIPE_SECRET_NAMES) {
      refineStripeSecret({ environment, name, context });
    }
  }

  if (!isProductionRuntime(environment)) {
    return;
  }

  if (environment.PAYMENTS_PROVIDER === "memory") {
    context.addIssue({
      code: "custom",
      message: "PAYMENTS_PROVIDER must be stripe in a production runtime.",
      path: ["PAYMENTS_PROVIDER"],
    });
  }

  if (environment.STRIPE_API_BASE_URL) {
    context.addIssue({
      code: "custom",
      message:
        "STRIPE_API_BASE_URL is a test override and is refused in a production runtime.",
      path: ["STRIPE_API_BASE_URL"],
    });
  }
}

function refineStripeSecret({
  environment,
  name,
  context,
}: {
  environment: PaymentsConfig;
  name: StripeSecretName;
  context: z.RefinementCtx;
}): void {
  const secret = environment[name];

  if (!secret) {
    context.addIssue({
      code: "custom",
      message: `Stripe payments require ${name}.`,
      path: [name],
    });
    return;
  }

  if (secret === PLACEHOLDER_SECRET) {
    context.addIssue({
      code: "custom",
      message: `Stripe payments require a non-placeholder ${name}.`,
      path: [name],
    });
  }
}
