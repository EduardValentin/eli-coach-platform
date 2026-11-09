import type { SubscriptionsNotificationsPort } from "~/bounded-contexts/sales/subscriptions/domain/payment-link";
import type { ProductEmailPort } from "~/shared/email/index.server";

import {
  EmailSubscriptionsNotificationsAdapter,
  type EmailSubscriptionsNotificationsOptions,
} from "./email-subscriptions-notifications-adapter.server";

export function createSubscriptionsNotificationsAdapter(
  productEmailPort: ProductEmailPort,
  options: EmailSubscriptionsNotificationsOptions,
): SubscriptionsNotificationsPort {
  return new EmailSubscriptionsNotificationsAdapter(productEmailPort, options);
}
