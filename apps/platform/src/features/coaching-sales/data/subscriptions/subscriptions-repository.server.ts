import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  CoachingSubscription,
  type CoachingSubscriptions,
  type SubscriptionChange,
  type SubscriptionEventChange,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { Clock } from "@eli-coach-platform/domain/shared";
import { recordPaymentEvent } from "@eli-coach-platform/infrastructure/payments/server";
import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";

import {
  clientsTable,
  coachingSubscriptionsTable,
} from "~/features/coaching-sales/data/schema.server";
import {
  changedColumns,
  selectSubscriptions,
  toSubscriptionSnapshot,
} from "~/features/coaching-sales/data/subscriptions/subscription-row.server";

type PostgresCoachingSubscriptionsOptions = {
  clock: Clock;
  database: DatabaseClient;
};

class StaleSubscriptionWrite extends Error {}

export class PostgresCoachingSubscriptions implements CoachingSubscriptions {
  constructor(private readonly options: PostgresCoachingSubscriptionsOptions) {}

  findCurrentForClient(clientId: string): Promise<CoachingSubscription | null> {
    return this.findLatest(eq(coachingSubscriptionsTable.clientId, clientId));
  }

  findCurrentForAuthSubject(
    authSubjectId: string,
  ): Promise<CoachingSubscription | null> {
    return this.findLatest(
      inArray(
        coachingSubscriptionsTable.clientId,
        this.options.database
          .select({ id: clientsTable.id })
          .from(clientsTable)
          .where(eq(clientsTable.authSubjectId, authSubjectId)),
      ),
    );
  }

  findByPaymentSubscriptionId(
    paymentSubscriptionId: string,
  ): Promise<CoachingSubscription | null> {
    return this.findLatest(
      eq(
        coachingSubscriptionsTable.stripeSubscriptionId,
        paymentSubscriptionId,
      ),
    );
  }

  findLatestByPaymentCustomerId(
    paymentCustomerId: string,
  ): Promise<CoachingSubscription | null> {
    return this.findLatest(
      eq(coachingSubscriptionsTable.stripeCustomerId, paymentCustomerId),
    );
  }

  async save(change: SubscriptionChange): Promise<"saved" | "stale"> {
    const written = await writeChange(this.options.database, change);

    return written ? "saved" : "stale";
  }

  async saveForEvent(
    change: SubscriptionEventChange,
  ): Promise<"recorded" | "duplicate" | "stale"> {
    const receivedAt = this.options.clock.now();

    try {
      return await this.options.database.transaction(async (transaction) => {
        const ledgerOutcome = await recordPaymentEvent(transaction, {
          eventId: change.eventId,
          receivedAt,
        });

        if (ledgerOutcome === "duplicate") {
          return "duplicate";
        }

        if (!(await writeChange(transaction, change))) {
          throw new StaleSubscriptionWrite();
        }

        return "recorded";
      });
    } catch (error) {
      if (error instanceof StaleSubscriptionWrite) {
        return "stale";
      }

      throw error;
    }
  }

  private async findLatest(
    condition: SQL,
  ): Promise<CoachingSubscription | null> {
    const [row] = await selectSubscriptions(this.options.database)
      .where(condition)
      .orderBy(desc(coachingSubscriptionsTable.paidAt))
      .limit(1);

    return row
      ? CoachingSubscription.reconstitute(toSubscriptionSnapshot(row))
      : null;
  }
}

async function writeChange(
  database: DatabaseClient | DatabaseTransaction,
  change: SubscriptionChange,
): Promise<boolean> {
  const previous = change.previous.toSnapshot();
  const columns = changedColumns({
    subscription: change.subscription.toSnapshot(),
    previous,
  });

  if (Object.keys(columns).length === 0) {
    return true;
  }

  const refundedCents = previous.refund?.refundedCents ?? null;
  const written = await database
    .update(coachingSubscriptionsTable)
    .set(columns)
    .where(
      and(
        eq(coachingSubscriptionsTable.id, previous.id),
        eq(coachingSubscriptionsTable.status, previous.status),
        eq(coachingSubscriptionsTable.startChoice, previous.startChoice),
        refundedCents === null
          ? isNull(coachingSubscriptionsTable.refundedCents)
          : eq(coachingSubscriptionsTable.refundedCents, refundedCents),
      ),
    )
    .returning({ id: coachingSubscriptionsTable.id });

  return written.length > 0;
}
