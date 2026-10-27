import type { DatabaseClient, DatabaseTransaction } from "~/shared/database";
import {
  CoachingSubscription,
  type CoachingSubscriptionSnapshot,
  type CoachingSubscriptions,
  type RefundDueSnapshot,
  type SubscriptionChange,
  type SubscriptionEventChange,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { Clock } from "@eli-coach-platform/domain/shared";
import { recordEventOnce } from "@eli-coach-platform/infrastructure/payments/server";
import { and, desc, eq, isNull, type Column, type SQL } from "drizzle-orm";

import type { CoachingStandingWriter } from "~/bounded-contexts/sales/coaching-sales/data/client-writers.server";
import { coachingSubscriptionsTable } from "~/bounded-contexts/sales/coaching-sales/data/schema.server";

type PostgresCoachingSubscriptionsOptions = {
  clock: Clock;
  database: DatabaseClient;
  writeCoachingStanding: CoachingStandingWriter;
};

type CoachingSubscriptionRow = typeof coachingSubscriptionsTable.$inferSelect;

type SubscriptionWrite = Partial<
  Pick<
    typeof coachingSubscriptionsTable.$inferInsert,
    | "status"
    | "startChoice"
    | "paidThrough"
    | "programStartsAt"
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
    const [row] = await this.options.database
      .select()
      .from(coachingSubscriptionsTable)
      .where(condition)
      .orderBy(
        desc(coachingSubscriptionsTable.paidAt),
        desc(coachingSubscriptionsTable.id),
      )
      .limit(1);

    return row
      ? CoachingSubscription.reconstitute(this.toSubscriptionSnapshot(row))
      : null;
  }

  private async writeChange(
    transaction: DatabaseTransaction,
    change: SubscriptionChange,
  ): Promise<boolean> {
    const previous = change.previous.toSnapshot();
    const columns = this.changedColumns({
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
      columns: SubscriptionWrite;
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
          eq(coachingSubscriptionsTable.paidThrough, previous.paidThrough),
          eq(
            coachingSubscriptionsTable.programStartsAt,
            previous.programStartsAt,
          ),
          this.holds(
            coachingSubscriptionsTable.cancelledAt,
            previous.cancelledAt,
          ),
          this.holds(
            coachingSubscriptionsTable.accessEndsAt,
            previous.accessEndsAt,
          ),
          this.holds(
            coachingSubscriptionsTable.paymentProblemSince,
            previous.paymentProblemSince,
          ),
          this.holds(
            coachingSubscriptionsTable.refundedCents,
            previous.refund?.refundedCents ?? null,
          ),
        ),
      )
      .returning({ id: coachingSubscriptionsTable.id });

    return written.length > 0;
  }

  private toSubscriptionSnapshot(
    row: CoachingSubscriptionRow,
  ): CoachingSubscriptionSnapshot {
    return {
      id: row.id,
      clientId: row.clientId,
      bundleId: row.bundleId,
      months: row.months,
      tier: row.tier,
      amountCents: row.amountCents,
      currency: row.currency,
      paymentCustomerId: row.stripeCustomerId,
      paymentSubscriptionId: row.stripeSubscriptionId,
      checkoutSessionId: row.stripeCheckoutSessionId,
      paidAt: row.paidAt,
      paidThrough: row.paidThrough,
      programStartsAt: row.programStartsAt,
      startChoice: row.startChoice,
      status: row.status,
      cancelledAt: row.cancelledAt,
      accessEndsAt: row.accessEndsAt,
      paymentProblemSince: row.paymentProblemSince,
      refund: this.refundOf(row),
    };
  }

  private refundOf(row: CoachingSubscriptionRow): RefundDueSnapshot | null {
    const { refundReason, refundDueCents, refundedCents } = row;

    if (
      refundReason === null ||
      refundDueCents === null ||
      refundedCents === null
    ) {
      return null;
    }

    return {
      reason: refundReason,
      amountCents: refundDueCents,
      dueBy: row.refundDueBy,
      refundedCents,
      refundedAt: row.refundedAt,
    };
  }

  private changedColumns(change: {
    subscription: CoachingSubscriptionSnapshot;
    previous: CoachingSubscriptionSnapshot;
  }): SubscriptionWrite {
    const next = this.writableColumnsOf(change.subscription);
    const previous = this.writableColumnsOf(change.previous);

    return Object.fromEntries(
      Object.entries(next).filter(
        ([column, value]) =>
          !this.sameValue(value, previous[column as keyof SubscriptionWrite]),
      ),
    );
  }

  private writableColumnsOf(
    snapshot: CoachingSubscriptionSnapshot,
  ): Required<SubscriptionWrite> {
    return {
      status: snapshot.status,
      startChoice: snapshot.startChoice,
      paidThrough: snapshot.paidThrough,
      programStartsAt: snapshot.programStartsAt,
      cancelledAt: snapshot.cancelledAt,
      accessEndsAt: snapshot.accessEndsAt,
      paymentProblemSince: snapshot.paymentProblemSince,
      ...this.refundColumnsOf(snapshot.refund),
    };
  }

  private refundColumnsOf(refund: RefundDueSnapshot | null) {
    return {
      refundReason: refund?.reason ?? null,
      refundDueCents: refund?.amountCents ?? null,
      refundDueBy: refund?.dueBy ?? null,
      refundedCents: refund?.refundedCents ?? null,
      refundedAt: refund?.refundedAt ?? null,
    };
  }

  private sameValue(left: unknown, right: unknown): boolean {
    if (left instanceof Date && right instanceof Date) {
      return left.getTime() === right.getTime();
    }

    return left === right;
  }

  private holds<Value>(column: Column, value: Value | null): SQL {
    return value === null ? isNull(column) : eq(column, value);
  }
}
