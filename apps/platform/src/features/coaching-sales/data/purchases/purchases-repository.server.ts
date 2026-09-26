import {
  isCausedByDatabaseError,
  type DatabaseClient,
  type DatabaseTransaction,
} from "@eli-coach-platform/db";
import type {
  CoachingPurchase,
  CoachingPurchases,
} from "@eli-coach-platform/domain/coaching-subscription";
import type {
  CallSalesState,
  CallSalesStates,
} from "@eli-coach-platform/domain/payment-link";
import type { Clock } from "@eli-coach-platform/domain/shared";
import { and, eq, gt, inArray, sql } from "drizzle-orm";

import {
  checkoutSessionsTable,
  clientsTable,
  coachingSalesConstraints,
  coachingSubscriptionsTable,
  paymentEventsTable,
  paymentLinksTable,
} from "~/features/coaching-sales/data/schema.server";

type PurchaseOutcome = Awaited<
  ReturnType<CoachingPurchases["recordCompletion"]>
>;

type RefusedPurchase = Exclude<PurchaseOutcome, "recorded">;

type PostgresCoachingPurchasesOptions = {
  clock: Clock;
  database: DatabaseClient;
};

const UNIQUE_VIOLATION_CODE = "23505";

const REFUSALS_BY_CONSTRAINT: ReadonlyMap<string, RefusedPurchase> = new Map([
  [coachingSalesConstraints.paymentEventId, "duplicate_event"],
  [coachingSalesConstraints.clientPerCall, "call_already_paid"],
]);

const SALES_STATE_PRECEDENCE: readonly CallSalesState[] = [
  "held",
  "payment-link-sent",
  "paid",
];

export class PostgresCoachingPurchases
  implements CoachingPurchases, CallSalesStates
{
  constructor(private readonly options: PostgresCoachingPurchasesOptions) {}

  async recordCompletion(purchase: CoachingPurchase): Promise<PurchaseOutcome> {
    const receivedAt = this.options.clock.now();

    try {
      await this.options.database.transaction((transaction) =>
        recordPurchase(transaction, { purchase, receivedAt }),
      );

      return "recorded";
    } catch (error) {
      return refusedPurchaseOf(error);
    }
  }

  async forCalls(
    callIds: readonly string[],
  ): Promise<ReadonlyMap<string, CallSalesState>> {
    if (callIds.length === 0) {
      return new Map();
    }

    const advancedStates = await this.options.database
      .select({
        assessmentCallId: clientsTable.assessmentCallId,
        state: sql<CallSalesState>`'paid'`,
      })
      .from(clientsTable)
      .where(inArray(clientsTable.assessmentCallId, [...callIds]))
      .union(
        this.options.database
          .select({
            assessmentCallId: paymentLinksTable.assessmentCallId,
            state: sql<CallSalesState>`'payment-link-sent'`,
          })
          .from(paymentLinksTable)
          .where(
            and(
              inArray(paymentLinksTable.assessmentCallId, [...callIds]),
              eq(paymentLinksTable.state, "valid"),
              gt(paymentLinksTable.expiresAt, this.options.clock.now()),
            ),
          ),
      );

    return salesStatesOf(callIds, advancedStates);
  }
}

async function recordPurchase(
  transaction: DatabaseTransaction,
  recording: { purchase: CoachingPurchase; receivedAt: Date },
): Promise<void> {
  const { client, eventId, subscription } = recording.purchase;

  await transaction
    .insert(paymentEventsTable)
    .values({ id: eventId, receivedAt: recording.receivedAt });

  const [clientRow] = await transaction
    .insert(clientsTable)
    .values(client.toSnapshot())
    .returning({ id: clientsTable.id });

  if (!clientRow) {
    throw new Error("Client insert returned no row.");
  }

  await transaction.insert(coachingSubscriptionsTable).values({
    clientId: clientRow.id,
    assessmentCallId: client.assessmentCallId,
    bundleId: subscription.bundleId,
    months: subscription.months,
    tier: subscription.tier,
    amountCents: subscription.amountCents,
    currency: subscription.currency,
    stripeCustomerId: subscription.paymentCustomerId,
    stripeSubscriptionId: subscription.paymentSubscriptionId,
    stripeCheckoutSessionId: subscription.checkoutSessionId,
    paidAt: subscription.paidAt,
    startChoice: subscription.startChoice,
    status: subscription.status,
    createdAt: recording.receivedAt,
  });

  await transaction
    .update(paymentLinksTable)
    .set({ state: "spent" })
    .where(
      inArray(
        paymentLinksTable.id,
        transaction
          .select({ id: checkoutSessionsTable.paymentLinkId })
          .from(checkoutSessionsTable)
          .where(eq(checkoutSessionsTable.id, subscription.checkoutSessionId)),
      ),
    );
}

function refusedPurchaseOf(error: unknown): RefusedPurchase {
  for (const [constraint, refusal] of REFUSALS_BY_CONSTRAINT) {
    if (violatesUniqueConstraint(error, constraint)) {
      return refusal;
    }
  }

  throw error;
}

function violatesUniqueConstraint(error: unknown, constraint: string): boolean {
  return isCausedByDatabaseError(
    error,
    (fields) =>
      fields.code === UNIQUE_VIOLATION_CODE && fields.constraint === constraint,
  );
}

function salesStatesOf(
  callIds: readonly string[],
  advancedStates: readonly {
    assessmentCallId: string;
    state: CallSalesState;
  }[],
): ReadonlyMap<string, CallSalesState> {
  const states = new Map<string, CallSalesState>(
    callIds.map((callId) => [callId, "held"]),
  );

  for (const { assessmentCallId, state } of advancedStates) {
    const current = states.get(assessmentCallId) ?? "held";

    if (outranks(state, current)) {
      states.set(assessmentCallId, state);
    }
  }

  return states;
}

function outranks(candidate: CallSalesState, current: CallSalesState): boolean {
  return (
    SALES_STATE_PRECEDENCE.indexOf(candidate) >
    SALES_STATE_PRECEDENCE.indexOf(current)
  );
}
