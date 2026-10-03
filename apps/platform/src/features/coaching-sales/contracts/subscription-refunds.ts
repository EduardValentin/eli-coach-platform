import {
  WITHDRAWAL_WINDOW_DAYS,
  type RefundReason,
} from "@eli-coach-platform/domain/coaching-subscription";

export const REFUND_REASON_LABELS: Readonly<Record<RefundReason, string>> = {
  "full-refund": `Full refund: cancelled within the ${WITHDRAWAL_WINDOW_DAYS}-day withdrawal period.`,
  "coach-issued": "Refunded from the payment provider.",
};
