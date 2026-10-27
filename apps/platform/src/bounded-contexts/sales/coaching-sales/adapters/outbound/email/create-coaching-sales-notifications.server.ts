import type { RefundNotifications } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { CoachingSalesNotifications } from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";
import type { ProductEmail } from "~/shared/email/index.server";

import {
  EmailCoachingSalesNotifications,
  type EmailCoachingSalesNotificationsOptions,
} from "./email-coaching-sales-notifications.server";
import {
  EmailRefundNotifications,
  type EmailRefundNotificationsOptions,
} from "./email-refund-notifications.server";

export function createCoachingSalesNotifications(
  productEmail: ProductEmail,
  options: EmailCoachingSalesNotificationsOptions,
): CoachingSalesNotifications {
  return new EmailCoachingSalesNotifications(productEmail, options);
}

export function createRefundNotifications(
  productEmail: ProductEmail,
  options: EmailRefundNotificationsOptions,
): RefundNotifications {
  return new EmailRefundNotifications(productEmail, options);
}
