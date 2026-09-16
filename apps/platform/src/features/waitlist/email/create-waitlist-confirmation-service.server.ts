import type { ProductEmail } from "@eli-coach-platform/domain/shared";
import type { WaitlistConfirmationService } from "@eli-coach-platform/domain/waitlist";

import { EmailWaitlistConfirmationService } from "./email-waitlist-confirmation-service.server";

type CreateWaitlistConfirmationServiceOptions = {
  contactEmail: string;
  privacyEmail: string;
};

export function createWaitlistConfirmationService(
  productEmail: ProductEmail,
  options: CreateWaitlistConfirmationServiceOptions,
): WaitlistConfirmationService {
  return new EmailWaitlistConfirmationService(productEmail, options);
}
