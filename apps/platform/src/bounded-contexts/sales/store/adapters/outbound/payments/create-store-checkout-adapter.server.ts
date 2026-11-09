import type { PaymentProvider } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-provider-adapter.server";
import type { StoreCheckoutPort } from "~/bounded-contexts/sales/store/domain/order";

import { InMemoryStoreCheckoutAdapter } from "./memory/in-memory-store-checkout-adapter.server";
import { StripeStoreCheckoutAdapter } from "./stripe/stripe-store-checkout-adapter.server";

export function createStoreCheckoutAdapter(
  paymentProvider: PaymentProvider,
): StoreCheckoutPort {
  if (paymentProvider.name === "memory") {
    return new InMemoryStoreCheckoutAdapter();
  }

  return new StripeStoreCheckoutAdapter(paymentProvider.stripeClient);
}
