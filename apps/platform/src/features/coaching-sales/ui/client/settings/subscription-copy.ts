import { bundleLengthLabel } from "~/features/coaching-sales/public/bundle-cards";
import type { ClientSettings } from "~/features/coaching-sales/public/client-subscription";

export type OfferedCancellation = NonNullable<
  ClientSettings["cancellation"]
>["rule"];

export const SETTINGS_TITLE = "Settings";

export const SETTINGS_META_TITLE = "Settings | Evoa";

export const SUBSCRIPTION_TITLE = "Subscription";

export const CANCELLATION_ROW_TITLE = "Cancellation";

export const PAYMENT_METHOD_ROW_TITLE = "Payment method";

export const CANCEL_ACTION_LABELS: Readonly<
  Record<OfferedCancellation, string>
> = {
  "full-refund": "Cancel and get a full refund",
  "no-refund": "Cancel subscription",
};

export const CANCEL_ROW_ACTION_LABEL = "Cancel";

export const KEEP_COACHING_LABEL = "Keep my coaching";

export const CANCELLING_LABEL = "Cancelling…";

export const CANCEL_UNAVAILABLE_MESSAGE =
  "Your coaching couldn't be cancelled just now. Nothing has changed, so please try again.";

export const FULL_REFUND_CONFIRMATION =
  "You'll get a full refund and your access ends right away.";

type CancelledPlanDays = {
  paidDay: string;
  cancelledDay: string;
  accessEndDay: string;
};

export function planTitle(months: number): string {
  return `${bundleLengthLabel(months)} of coaching`;
}

export function waitingPlanLine(paidDay: string): string {
  return `Paid ${paidDay} · starts when your program is delivered.`;
}

export function cancelledPlanLine(days: CancelledPlanDays): string {
  return `Paid ${days.paidDay} · cancelled ${days.cancelledDay} · access until ${days.accessEndDay}.`;
}

export function activePlanLine(accessEndDay: string): string {
  return `Active until ${accessEndDay} · renews then unless you cancel first.`;
}

export function fullRefundFacts(withdrawalDeadlineDay: string): string {
  return `Until ${withdrawalDeadlineDay} you can cancel for a full refund. Your access ends right away.`;
}

export function noRefundFacts(accessEndDay: string): string {
  return `You won't be charged again, there is no refund for the coaching already paid, and your access stays until ${accessEndDay}.`;
}

export function cancelledToast(accessEndDay: string): string {
  return `Subscription cancelled. Your access stays until ${accessEndDay}.`;
}
