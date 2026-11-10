import type { CallSalesState } from "~/bounded-contexts/sales/subscriptions/public/subscriptions";

export const CALL_SALES_STATE_LABELS: Record<CallSalesState, string> = {
  held: "Call held",
  "payment-link-sent": "Payment link sent",
  paid: "Paid",
};
