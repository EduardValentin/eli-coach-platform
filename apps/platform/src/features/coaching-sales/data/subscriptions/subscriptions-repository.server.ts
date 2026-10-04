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
import { recordEventOnce } from "@eli-coach-platform/infrastructure/payments/server";
import { and, eq, inArray, isNull, type Column, type SQL } from "drizzle-orm";

import {
  clientsTable,
  coachingSubscriptionsTable,
} from "~/features/coaching-sales/data/schema.server";
import { mostRecentlyPaidFirst } from "~/features/coaching-sales/data/subscriptions/current-subscription.server";
import {
  changedColumns,
  selectSubscriptions,
  toSubscriptionSnapshot,
} from "~/features/coaching-sales/data/subscriptions/subscription-row.server";

type PostgresCoachingSubscriptionsOptions = {
  clock: Clock;
  database: DatabaseClient;
};

export class PostgresCoachingSubscriptions implements CoachingSubscriptions {
  constructor(private readonly options: PostgresCoachingSubscriptionsOptions) {}

  findCurrentForClient(clientId: string): Promise<CoachingSubscription | null> {
    return this.findCurrent(eq(coachingSubscriptionsTable.clientId, clientId));
  }

  findCurrentForAuthSubject(
    authSubjectId: string,
  ): Promise<CoachingSubscription | null> {
    return this.findCurrent(
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
    return this.findCurrent(
      eq(
        coachingSubscriptionsTable.stripeSubscriptionId,
        paymentSubscriptionId,
      ),
    );
  }

  findCurrentByPaymentCustomerId(
    paymentCustomerId: string,
  ): Promise<CoachingSubscription | null> {
    return this.findCurrent(
      eq(coachingSubscriptionsTable.stripeCustomerId, paymentCustomerId),
    );
  }

  async save(change: SubscriptionChange): Promise<"saved" | "stale"> {
    const written = await writeChange(this.options.database, change);

    return written ? "saved" : "stale";
  }

  saveForEvent(
    change: SubscriptionEventChange,
  ): Promise<"recorded" | "duplicate" | "stale"> {
    return recordEventOnce(this.options.database, {
      eventId: change.eventId,
      receivedAt: this.options.clock.now(),
      write: (transaction) => writeChange(transaction, change),
    });
  }

  private async findCurrent(
    condition: SQL,
  ): Promise<CoachingSubscription | null> {
    const [row] = await selectSubscriptions(this.options.database)
      .where(condition)
      .orderBy(...mostRecentlyPaidFirst(coachingSubscriptionsTable))
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

  const written = await database
    .update(coachingSubscriptionsTable)
    .set(columns)
    .where(
      and(
        eq(coachingSubscriptionsTable.id, previous.id),
        eq(coachingSubscriptionsTable.status, previous.status),
        eq(coachingSubscriptionsTable.startChoice, previous.startChoice),
        holds(coachingSubscriptionsTable.cancelledAt, previous.cancelledAt),
        holds(coachingSubscriptionsTable.accessEndsAt, previous.accessEndsAt),
        holds(
          coachingSubscriptionsTable.paymentProblemSince,
          previous.paymentProblemSince,
        ),
        holds(
          coachingSubscriptionsTable.refundedCents,
          previous.refund?.refundedCents ?? null,
        ),
      ),
    )
    .returning({ id: coachingSubscriptionsTable.id });

  return written.length > 0;
}

function holds<Value>(column: Column, value: Value | null): SQL {
  return value === null ? isNull(column) : eq(column, value);
}
