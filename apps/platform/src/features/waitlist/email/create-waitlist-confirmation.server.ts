import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import type { WaitlistConfirmation } from "@eli-coach-platform/domain/waitlist";

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
