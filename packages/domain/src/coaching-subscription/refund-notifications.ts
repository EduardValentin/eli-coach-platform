import type { RefundDueSnapshot } from "./refund-due";

export type RefundDueNotice = {
  subscriptionId: string;
  client: { firstName: string; lastName: string };
  currency: string;
  refund: RefundDueSnapshot;
};

export interface RefundNotifications {
  notifyRefundDue(notice: RefundDueNotice): Promise<"sent" | "failed">;
}
