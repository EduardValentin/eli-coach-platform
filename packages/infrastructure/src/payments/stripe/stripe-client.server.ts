import type { PaymentsConfig } from "@eli-coach-platform/config";
import Stripe from "stripe";

type StripeConnection = {
  host: string;
  port: number;
  protocol: "http" | "https";
};

const DEFAULT_PORTS = { http: 80, https: 443 } as const;

export function createStripeClient(config: PaymentsConfig): Stripe {
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
