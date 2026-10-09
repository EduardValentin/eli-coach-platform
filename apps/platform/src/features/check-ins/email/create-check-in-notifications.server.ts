import type { CheckInNotifications } from "@eli-coach-platform/domain/check-in";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import {
  EmailCheckInNotifications,
  type EmailCheckInNotificationsOptions,
} from "./email-check-in-notifications.server";

export function createCheckInNotifications(
  productEmail: ProductEmail,
  options: EmailCheckInNotificationsOptions,
): CheckInNotifications {
  return new EmailCheckInNotifications(productEmail, options);
}
