import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork, executorOf } from "~/shared/database/index.server";
import type {
  CoachingPurchase,
  CoachingPurchaseOutcome,
  CoachingPurchases,
  PaidClientAdmission,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type {
  CallSale,
  CallSalesState,
  CallSalesStates,
} from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";
import type { Clock } from "~/bounded-contexts/sales/coaching-sales/domain/clock";
import { recordPaymentEvent } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-ledger.server";
import { and, eq, gt, inArray, sql } from "drizzle-orm";

import {
  checkoutSessionsTable,
  coachingSubscriptionsTable,
  paymentLinksTable,
} from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/schema.server";

type PostgresCoachingPurchasesOptions = {
  admission: Pick<PaidClientAdmission, "admit">;
  clock: Clock;
  database: DatabaseClient;
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

  private get executor() {
    return executorOf(this.options.database);
  }

  async recordCompletion(
    purchase: CoachingPurchase,
  ): Promise<CoachingPurchaseOutcome> {
    try {
      return await createUnitOfWork(this.options.database)(() =>
        this.recordPurchase(purchase),
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

    const advancedSales = await this.executor
      .select({
        assessmentCallId: coachingSubscriptionsTable.assessmentCallId,
        state: sql<CallSalesState>`'paid'`,
        clientId: sql<string | null>`${coachingSubscriptionsTable.clientId}`,
      })
      .from(coachingSubscriptionsTable)
      .where(inArray(coachingSubscriptionsTable.assessmentCallId, [...callIds]))
      .union(
        this.executor
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
    purchase: CoachingPurchase,
  ): Promise<CoachingPurchaseOutcome> {
    const { client, eventId, receivedAt, subscription } = purchase;
    const ledgerOutcome = await recordPaymentEvent(this.options.database, {
      eventId,
      receivedAt,
    });

    if (ledgerOutcome === "duplicate") {
      return {
        outcome: "duplicate_event",
        clientId: await this.findClientIdForCall(client.assessmentCallId),
      };
    }

    const admitted = await this.options.admission.admit({
      client,
      standing: subscription.standing(),
      at: receivedAt,
    });

    if (admitted.status === "call_already_has_client") {
      throw new CallAlreadyPaid();
    }

    const { clientId } = admitted;
    const purchased = subscription.toSnapshot();

    await this.executor.insert(coachingSubscriptionsTable).values({
      id: purchased.id,
      clientId,
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
    await this.executor
      .update(paymentLinksTable)
      .set({ state: "spent" })
      .where(
        inArray(
          paymentLinksTable.id,
          this.executor
            .select({ id: checkoutSessionsTable.paymentLinkId })
            .from(checkoutSessionsTable)
            .where(
              eq(checkoutSessionsTable.id, subscription.checkoutSessionId),
            ),
        ),
      );

    return { outcome: "recorded", clientId };
  }

  private async findClientIdForCall(assessmentCallId: string): Promise<string> {
    const [subscriptionRow] = await this.executor
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
