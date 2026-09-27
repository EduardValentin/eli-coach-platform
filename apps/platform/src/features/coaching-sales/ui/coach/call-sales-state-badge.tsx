import { Badge } from "@eli-coach-platform/ui/primitives";

import type { CallSalesState } from "~/features/coaching-sales/contracts/coaching-sales";

import { CALL_SALES_STATE_LABELS } from "./call-sales-state-labels";

const TONE_BY_STATE = {
  held: "muted",
  "payment-link-sent": "pending",
  paid: "success",
} as const satisfies Record<CallSalesState, string>;

export function CallSalesStateBadge({ state }: { state: CallSalesState }) {
  return (
    <Badge data-parity="sales-state" tone={TONE_BY_STATE[state]}>
      {CALL_SALES_STATE_LABELS[state]}
    </Badge>
  );
}
