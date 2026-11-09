import type { PaymentsConfig } from "~/bounded-contexts/sales/shared/payments/config.server";
import Stripe from "stripe";

export type StripeClient = Stripe;

type StripeConnection = {
  host: string;
  port: number;
  protocol: "http" | "https";
};

const DEFAULT_PORTS = { http: 80, https: 443 } as const;

export function createStripeClient(config: PaymentsConfig): StripeClient {
  if (!config.STRIPE_SECRET_KEY) {
    throw new Error("Stripe payments require STRIPE_SECRET_KEY.");
  }

  if (!config.STRIPE_API_BASE_URL) {
    return new Stripe(config.STRIPE_SECRET_KEY);
  }

  return new Stripe(
    config.STRIPE_SECRET_KEY,
    stripeConnection(config.STRIPE_API_BASE_URL),
  );
}

function stripeConnection(baseUrl: string): StripeConnection {
  const url = new URL(baseUrl);
  const protocol = url.protocol === "http:" ? "http" : "https";

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : DEFAULT_PORTS[protocol],
    protocol,
  };
}
