import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  CoachingSubscription,
  type CoachingSubscriptionSnapshot,
  type CoachingSubscriptions,
  type SubscriptionChange,
  type SubscriptionEventChange,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { Clock } from "@eli-coach-platform/domain/shared";
import { recordEventOnce } from "@eli-coach-platform/infrastructure/payments/server";
import { and, desc, eq, isNull, type Column, type SQL } from "drizzle-orm";

import type { CoachingStandingWriter } from "~/features/coaching-sales/data/client-writers.server";
import { coachingSubscriptionsTable } from "~/features/coaching-sales/data/schema.server";
import {
  changedColumns,
  selectSubscriptions,
  toSubscriptionSnapshot,
} from "~/features/coaching-sales/data/subscriptions/subscription-row.server";

type PostgresCoachingSubscriptionsOptions = {
  clock: Clock;
  database: DatabaseClient;
  writeCoachingStanding: CoachingStandingWriter;
};

export class PostgresCoachingSubscriptions implements CoachingSubscriptions {
  constructor(private readonly options: PostgresCoachingSubscriptionsOptions) {}

  findCurrentForClient(clientId: string): Promise<CoachingSubscription | null> {
    return this.findCurrent(eq(coachingSubscriptionsTable.clientId, clientId));
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

  findByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<CoachingSubscription | null> {
    return this.findCurrent(
      eq(coachingSubscriptionsTable.stripePaymentIntentId, paymentIntentId),
    );
  }

  async save(change: SubscriptionChange): Promise<"saved" | "stale"> {
    const written = await this.options.database.transaction((transaction) =>
      this.writeChange(transaction, change),
    );

    return written ? "saved" : "stale";
  }

  saveForEvent(
    change: SubscriptionEventChange,
  ): Promise<"recorded" | "duplicate" | "stale"> {
    return recordEventOnce(this.options.database, {
      eventId: change.eventId,
      receivedAt: this.options.clock.now(),
      write: (transaction) => this.writeChange(transaction, change),
    });
  }

  private async findCurrent(
    condition: SQL,
  ): Promise<CoachingSubscription | null> {
    const [row] = await selectSubscriptions(this.options.database)
      .where(condition)
      .orderBy(
        desc(coachingSubscriptionsTable.paidAt),
        desc(coachingSubscriptionsTable.id),
      )
      .limit(1);

    return row
      ? CoachingSubscription.reconstitute(toSubscriptionSnapshot(row))
      : null;
  }

  private async writeChange(
    transaction: DatabaseTransaction,
    change: SubscriptionChange,
  ): Promise<boolean> {
    const previous = change.previous.toSnapshot();
    const columns = changedColumns({
      subscription: change.subscription.toSnapshot(),
      previous,
    });

    const written =
      Object.keys(columns).length === 0 ||
      (await this.updateHeld(transaction, { columns, previous }));

    if (written) {
      await this.options.writeCoachingStanding(transaction, {
        clientId: previous.clientId,
        standing: change.subscription.standing(),
      });
    }

    return written;
  }

  private async updateHeld(
    transaction: DatabaseTransaction,
    update: {
      columns: ReturnType<typeof changedColumns>;
      previous: CoachingSubscriptionSnapshot;
    },
  ): Promise<boolean> {
    const { columns, previous } = update;
    const written = await transaction
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
}

function holds<Value>(column: Column, value: Value | null): SQL {
  return value === null ? isNull(column) : eq(column, value);
}
