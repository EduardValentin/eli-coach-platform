import type { CoachingSalesNotificationsPort } from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";
import type { ProductEmailPort } from "~/shared/email/index.server";

import {
  EmailCoachingSalesNotificationsAdapter,
  type EmailCoachingSalesNotificationsOptions,
} from "./email-coaching-sales-notifications-adapter.server";

export function createCoachingSalesNotificationsAdapter(
  productEmailPort: ProductEmailPort,
  options: EmailCoachingSalesNotificationsOptions,
): CoachingSalesNotificationsPort {
  return new EmailCoachingSalesNotificationsAdapter(productEmailPort, options);
}
