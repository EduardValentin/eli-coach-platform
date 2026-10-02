import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  CoachingSubscriptionSnapshot,
  RefundDueSnapshot,
} from "@eli-coach-platform/domain/coaching-subscription";

import { coachingSubscriptionsTable } from "~/features/coaching-sales/data/schema.server";

export const subscriptionColumns = {
  id: coachingSubscriptionsTable.id,
  clientId: coachingSubscriptionsTable.clientId,
  bundleId: coachingSubscriptionsTable.bundleId,
  months: coachingSubscriptionsTable.months,
  tier: coachingSubscriptionsTable.tier,
  amountCents: coachingSubscriptionsTable.amountCents,
  currency: coachingSubscriptionsTable.currency,
  paymentCustomerId: coachingSubscriptionsTable.stripeCustomerId,
  paymentSubscriptionId: coachingSubscriptionsTable.stripeSubscriptionId,
  checkoutSessionId: coachingSubscriptionsTable.stripeCheckoutSessionId,
  paidAt: coachingSubscriptionsTable.paidAt,
  startChoice: coachingSubscriptionsTable.startChoice,
  status: coachingSubscriptionsTable.status,
  cancelledAt: coachingSubscriptionsTable.cancelledAt,
  accessEndsAt: coachingSubscriptionsTable.accessEndsAt,
  paymentProblemSince: coachingSubscriptionsTable.paymentProblemSince,
  refundReason: coachingSubscriptionsTable.refundReason,
  refundDueCents: coachingSubscriptionsTable.refundDueCents,
  refundDueBy: coachingSubscriptionsTable.refundDueBy,
  refundedCents: coachingSubscriptionsTable.refundedCents,
  refundedAt: coachingSubscriptionsTable.refundedAt,
};

export function selectSubscriptions(database: DatabaseClient) {
  return database.select(subscriptionColumns).from(coachingSubscriptionsTable);
}

type SubscriptionRow = Awaited<ReturnType<typeof selectSubscriptions>>[number];

type SubscriptionWrite = Partial<
  Pick<
    typeof coachingSubscriptionsTable.$inferInsert,
    | "status"
    | "startChoice"
    | "cancelledAt"
    | "accessEndsAt"
    | "paymentProblemSince"
    | "refundReason"
    | "refundDueCents"
    | "refundDueBy"
    | "refundedCents"
    | "refundedAt"
  >
>;

export function toSubscriptionSnapshot(
  row: SubscriptionRow,
): CoachingSubscriptionSnapshot {
  const {
    refundReason,
    refundDueCents,
    refundDueBy,
    refundedCents,
    refundedAt,
    ...subscription
  } = row;

  return {
    ...subscription,
    programStartedOn: null,
    refund:
      refundReason === null || refundDueCents === null || refundedCents === null
        ? null
        : {
            reason: refundReason,
            amountCents: refundDueCents,
            dueBy: refundDueBy,
            refundedCents,
            refundedAt,
          },
  };
}

export function changedColumns(change: {
  subscription: CoachingSubscriptionSnapshot;
  previous: CoachingSubscriptionSnapshot;
}): SubscriptionWrite {
  const next = writableColumnsOf(change.subscription);
  const previous = writableColumnsOf(change.previous);

  return Object.fromEntries(
    Object.entries(next).filter(
      ([column, value]) =>
        !sameValue(value, previous[column as keyof SubscriptionWrite]),
    ),
  );
}

function writableColumnsOf(
  snapshot: CoachingSubscriptionSnapshot,
): Required<SubscriptionWrite> {
  return {
    status: snapshot.status,
    startChoice: snapshot.startChoice,
    cancelledAt: snapshot.cancelledAt,
    accessEndsAt: snapshot.accessEndsAt,
    paymentProblemSince: snapshot.paymentProblemSince,
    ...refundColumnsOf(snapshot.refund),
  };
}

function refundColumnsOf(refund: RefundDueSnapshot | null) {
  return {
    refundReason: refund?.reason ?? null,
    refundDueCents: refund?.amountCents ?? null,
    refundDueBy: refund?.dueBy ?? null,
    refundedCents: refund?.refundedCents ?? null,
    refundedAt: refund?.refundedAt ?? null,
  };
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }

  return left === right;
}
