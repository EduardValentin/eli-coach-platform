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

import type {
  ClientWriter,
  CoachingStandingWriter,
} from "~/features/coaching-sales/data/client-writers.server";
import {
  checkoutSessionsTable,
  coachingSubscriptionsTable,
  paymentLinksTable,
} from "~/features/coaching-sales/data/schema.server";

type PostgresCoachingPurchasesOptions = {
  clock: Clock;
  database: DatabaseClient;
  writeClient: ClientWriter;
  writeCoachingStanding: CoachingStandingWriter;
};

class CallAlreadyPaid extends Error {}

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
    try {
      return await this.options.database.transaction((transaction) =>
        this.recordPurchase(transaction, purchase),
      );
    } catch (error) {
      if (error instanceof CallAlreadyPaid) {
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
        assessmentCallId: coachingSubscriptionsTable.assessmentCallId,
        state: sql<CallSalesState>`'paid'`,
        clientId: sql<string | null>`${coachingSubscriptionsTable.clientId}`,
      })
      .from(coachingSubscriptionsTable)
      .where(inArray(coachingSubscriptionsTable.assessmentCallId, [...callIds]))
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

    return this.callSalesOf(callIds, advancedSales);
  }

  private async recordPurchase(
    transaction: DatabaseTransaction,
    purchase: CoachingPurchase,
  ): Promise<CoachingPurchaseOutcome> {
    const { client, eventId, receivedAt, subscription } = purchase;
    const ledgerOutcome = await recordPaymentEvent(transaction, {
      eventId,
      receivedAt,
    });

    if (ledgerOutcome === "duplicate") {
      return {
        outcome: "duplicate_event",
        clientId: await this.findClientIdForCall(
          transaction,
          client.assessmentCallId,
        ),
      };
    }

    const written = await this.options.writeClient(transaction, client);

    if (written === "call_already_has_client") {
      throw new CallAlreadyPaid();
    }

    const purchased = subscription.toSnapshot();

    await transaction.insert(coachingSubscriptionsTable).values({
      id: purchased.id,
      clientId: client.id,
      assessmentCallId: client.assessmentCallId,
      bundleId: purchased.bundleId,
      months: purchased.months,
      tier: purchased.tier,
      amountCents: purchased.amountCents,
      currency: purchased.currency,
      stripeCustomerId: purchased.paymentCustomerId,
      stripeSubscriptionId: purchased.paymentSubscriptionId,
      stripePaymentIntentId: purchased.paymentIntentId,
      stripeCheckoutSessionId: purchased.checkoutSessionId,
      paidAt: purchased.paidAt,
      paidThrough: purchased.paidThrough,
      programStartsAt: purchased.programStartsAt,
      startChoice: purchased.startChoice,
      status: purchased.status,
      createdAt: receivedAt,
    });
    await this.options.writeCoachingStanding(transaction, {
      clientId: client.id,
      standing: subscription.standing(),
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
            .where(
              eq(checkoutSessionsTable.id, subscription.checkoutSessionId),
            ),
        ),
      );

    return { outcome: "recorded", clientId: client.id };
  }

  private async findClientIdForCall(
    transaction: DatabaseTransaction,
    assessmentCallId: string,
  ): Promise<string> {
    const [subscriptionRow] = await transaction
      .select({ clientId: coachingSubscriptionsTable.clientId })
      .from(coachingSubscriptionsTable)
      .where(eq(coachingSubscriptionsTable.assessmentCallId, assessmentCallId))
      .limit(1);

    if (!subscriptionRow) {
      throw new Error(
        `No client was recorded for assessment call ${assessmentCallId}.`,
      );
    }

    return subscriptionRow.clientId;
  }

  private callSalesOf(
    callIds: readonly string[],
    advancedSales: readonly ({ assessmentCallId: string } & CallSale)[],
  ): ReadonlyMap<string, CallSale> {
    const sales = new Map<string, CallSale>(
      callIds.map((callId) => [callId, { state: "held", clientId: null }]),
    );

    for (const { assessmentCallId, state, clientId } of advancedSales) {
      const current = sales.get(assessmentCallId)?.state ?? "held";

      if (this.outranks(state, current)) {
        sales.set(assessmentCallId, { state, clientId });
      }
    }

    return sales;
  }

  private outranks(
    candidate: CallSalesState,
    current: CallSalesState,
  ): boolean {
    return (
      SALES_STATE_PRECEDENCE.indexOf(candidate) >
      SALES_STATE_PRECEDENCE.indexOf(current)
    );
  }
}
