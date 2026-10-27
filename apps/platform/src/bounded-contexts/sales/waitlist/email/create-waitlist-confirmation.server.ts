import type { ProductEmail } from "~/shared/email/index.server";
import type { WaitlistConfirmation } from "~/bounded-contexts/sales/waitlist/domain/waitlist";

import { EmailWaitlistConfirmation } from "./email-waitlist-confirmation.server";

type CreateWaitlistConfirmationOptions = {
  contactEmail: string;
  privacyEmail: string;
};

export function createWaitlistConfirmation(
  productEmail: ProductEmail,
  options: CreateWaitlistConfirmationOptions,
): WaitlistConfirmation {
  return new EmailWaitlistConfirmation(productEmail, options);
}
