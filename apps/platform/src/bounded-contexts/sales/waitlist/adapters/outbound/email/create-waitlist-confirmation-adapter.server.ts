import type { ProductEmailPort } from "~/shared/email/index.server";
import type { WaitlistConfirmationPort } from "~/bounded-contexts/sales/waitlist/domain/waitlist";

import { EmailWaitlistConfirmationAdapter } from "./email-waitlist-confirmation-adapter.server";

type CreateWaitlistConfirmationOptions = {
  contactEmail: string;
  privacyEmail: string;
};

export function createWaitlistConfirmationAdapter(
  productEmailPort: ProductEmailPort,
  options: CreateWaitlistConfirmationOptions,
): WaitlistConfirmationPort {
  return new EmailWaitlistConfirmationAdapter(productEmailPort, options);
}
