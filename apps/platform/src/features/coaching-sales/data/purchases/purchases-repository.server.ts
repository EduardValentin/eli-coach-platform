import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import type {
  CoachingPurchase,
  CoachingPurchaseOutcome,
  CoachingPurchases,
} from "@eli-coach-platform/domain/coaching-subscription";
import type {
  CallSale,
  CallSalesState,
  CallSalesStates,
} from "@eli-coach-platform/domain/payment-link";
import type { Clock } from "@eli-coach-platform/domain/shared";
import { recordPaymentEvent } from "@eli-coach-platform/infrastructure/payments/server";
import { and, eq, gt, inArray, sql } from "drizzle-orm";

import {
  checkoutSessionsTable,
  clientsTable,
  coachingSalesConstraints,
  coachingSubscriptionsTable,
  paymentLinksTable,
} from "~/features/coaching-sales/data/schema.server";
import { violatesUniqueConstraint } from "~/features/coaching-sales/data/unique-violation.server";

type PostgresCoachingPurchasesOptions = {
  clock: Clock;
  database: DatabaseClient;
};

const SALES_STATE_PRECEDENCE: readonly CallSalesState[] = [
  "held",
  "payment-link-sent",
  "paid",
];

export class PostgresCoachingPurchases
  implements CoachingPurchases, CallSalesStates
{
  constructor(private readonly options: PostgresCoachingPurchasesOptions) {}

  async recordCompletion(
    purchase: CoachingPurchase,
  ): Promise<CoachingPurchaseOutcome> {
    const receivedAt = this.options.clock.now();

    try {
      return await this.options.database.transaction((transaction) =>
        recordPurchase(transaction, { purchase, receivedAt }),
      );
    } catch (error) {
      if (
        violatesUniqueConstraint(error, coachingSalesConstraints.clientPerCall)
      ) {
        return { outcome: "call_already_paid" };
      }

      throw error;
    }
  }

  async forCalls(
    callIds: readonly string[],
  ): Promise<ReadonlyMap<string, CallSale>> {
    if (callIds.length === 0) {
      return new Map();
    }

    const advancedSales = await this.options.database
      .select({
        assessmentCallId: clientsTable.assessmentCallId,
        state: sql<CallSalesState>`'paid'`,
        clientId: sql<string | null>`${clientsTable.id}`,
      })
      .from(clientsTable)
      .where(inArray(clientsTable.assessmentCallId, [...callIds]))
      .union(
        this.options.database
          .select({
            assessmentCallId: paymentLinksTable.assessmentCallId,
            state: sql<CallSalesState>`'payment-link-sent'`,
            clientId: sql<string | null>`null::uuid`,
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

    return callSalesOf(callIds, advancedSales);
  }
}

async function recordPurchase(
  transaction: DatabaseTransaction,
  recording: { purchase: CoachingPurchase; receivedAt: Date },
): Promise<CoachingPurchaseOutcome> {
  const { client, eventId, subscription } = recording.purchase;
  const ledgerOutcome = await recordPaymentEvent(transaction, {
    eventId,
    receivedAt: recording.receivedAt,
  });

  if (ledgerOutcome === "duplicate") {
    return {
      outcome: "duplicate_event",
      clientId: await findClientIdForCall(transaction, client.assessmentCallId),
    };
  }

  const [clientRow] = await transaction
    .insert(clientsTable)
    .values(client.toSnapshot())
    .returning({ id: clientsTable.id });

  if (!clientRow) {
    throw new Error("Client insert returned no row.");
  }

  const purchased = subscription.toSnapshot();

  await transaction.insert(coachingSubscriptionsTable).values({
    clientId: clientRow.id,
    assessmentCallId: client.assessmentCallId,
    bundleId: purchased.bundleId,
    months: purchased.months,
    tier: purchased.tier,
    amountCents: purchased.amountCents,
    currency: purchased.currency,
    stripeCustomerId: purchased.paymentCustomerId,
    stripeSubscriptionId: purchased.paymentSubscriptionId,
    stripeCheckoutSessionId: purchased.checkoutSessionId,
    paidAt: purchased.paidAt,
    startChoice: purchased.startChoice,
    status: purchased.status,
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

  return { outcome: "recorded", clientId: clientRow.id };
}

async function findClientIdForCall(
  transaction: DatabaseTransaction,
  assessmentCallId: string,
): Promise<string> {
  const [clientRow] = await transaction
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(eq(clientsTable.assessmentCallId, assessmentCallId))
    .limit(1);

  if (!clientRow) {
    throw new Error(
      `No client was recorded for assessment call ${assessmentCallId}.`,
    );
  }

  return clientRow.id;
}

function callSalesOf(
  callIds: readonly string[],
  advancedSales: readonly ({ assessmentCallId: string } & CallSale)[],
): ReadonlyMap<string, CallSale> {
  const sales = new Map<string, CallSale>(
    callIds.map((callId) => [callId, { state: "held", clientId: null }]),
  );

  for (const { assessmentCallId, state, clientId } of advancedSales) {
    const current = sales.get(assessmentCallId)?.state ?? "held";

    if (outranks(state, current)) {
      sales.set(assessmentCallId, { state, clientId });
    }
  }

  return sales;
}

function outranks(candidate: CallSalesState, current: CallSalesState): boolean {
  return (
    SALES_STATE_PRECEDENCE.indexOf(candidate) >
    SALES_STATE_PRECEDENCE.indexOf(current)
  );
}
