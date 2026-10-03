export type PaymentSubscriptionStanding =
  "ended" | "payment-problem" | "healthy" | "other";

const ENDED_STATUSES: readonly string[] = ["canceled", "incomplete_expired"];
const PAYMENT_PROBLEM_STATUSES: readonly string[] = ["past_due", "unpaid"];
const HEALTHY_STATUS = "active";

export function subscriptionStandingOf(
  status: string,
): PaymentSubscriptionStanding {
  if (ENDED_STATUSES.includes(status)) {
    return "ended";
  }

  if (PAYMENT_PROBLEM_STATUSES.includes(status)) {
    return "payment-problem";
  }

  return status === HEALTHY_STATUS ? "healthy" : "other";
}
