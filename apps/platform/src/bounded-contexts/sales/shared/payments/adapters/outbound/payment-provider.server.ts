import type { PaymentEventsPort } from "./payment-events-port.server";
import type { StripeClient } from "./stripe/stripe-client.server";

export type PaymentProvider =
  | { name: "memory"; paymentEventsPort: PaymentEventsPort }
  | {
      name: "stripe";
      stripeClient: StripeClient;
      paymentEventsPort: PaymentEventsPort;
    };
