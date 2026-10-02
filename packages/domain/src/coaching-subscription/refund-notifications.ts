import type { RefundDueSnapshot } from "./refund-due";

export type RefundDueNotice = {
  subscriptionId: string;
  client: {
    clientId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  paid: { amountCents: number; currency: string; at: Date };
  cancelledAt: Date;
  refund: RefundDueSnapshot;
};

export interface RefundNotifications {
  notifyRefundDue(notice: RefundDueNotice): Promise<"sent" | "failed">;
}
