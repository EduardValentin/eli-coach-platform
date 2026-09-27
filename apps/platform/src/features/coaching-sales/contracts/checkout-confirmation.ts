import { getCoachingBundle } from "@eli-coach-platform/domain/coaching-bundle";
import type { ReadCheckoutConfirmationUseCase } from "@eli-coach-platform/domain/coaching-subscription";

import { formatEuros, renewalLabel } from "./bundle-cards";
import type { CheckoutConfirmation } from "./coaching-sales";

type PaidCheckout = Extract<
  Awaited<ReturnType<ReadCheckoutConfirmationUseCase["execute"]>>,
  { status: "paid" }
>;

type PaidConfirmation = Extract<CheckoutConfirmation, { state: "paid" }>;

const CENTS_PER_EURO = 100;

export function presentPaidConfirmation(
  checkout: PaidCheckout,
): PaidConfirmation {
  const bundle = getCoachingBundle(checkout.bundleId);

  return {
    state: "paid",
    amount: formatEuros(checkout.amountCents / CENTS_PER_EURO),
    bundleTitle: bundle.title,
    email: checkout.email,
    renewalLabel: renewalLabel(bundle.months),
    startChoice: checkout.startChoice,
    waitingStartsOn: checkout.waitingStartsOn.toISOString(),
  };
}
