import type { ProductEmailPort } from "~/shared/email/product-email-port.server";
import type { RefundNotificationsPort } from "~/bounded-contexts/sales/subscriptions/domain/coaching-subscription/index";
import {
  type EmailRefundNotificationsOptions,
  EmailRefundNotificationsAdapter,
} from "./email-refund-notifications-adapter.server";

export function createRefundNotificationsAdapter(
  productEmailPort: ProductEmailPort,
  options: EmailRefundNotificationsOptions,
): RefundNotificationsPort {
  return new EmailRefundNotificationsAdapter(productEmailPort, options);
}
