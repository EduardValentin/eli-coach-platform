import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  CheckoutSessionRecord,
  CheckoutSessions,
} from "@eli-coach-platform/domain/coaching-subscription";
import {
  PaymentLink,
  type NewPaymentLink,
  type PaymentLinks,
} from "@eli-coach-platform/domain/payment-link";
import type { Clock } from "@eli-coach-platform/domain/shared";
import { and, desc, eq, isNotNull, isNull, ne } from "drizzle-orm";

import {
  checkoutSessionsTable,
  paymentLinksTable,
} from "~/features/coaching-sales/data/schema.server";

type PaymentLinkRow = typeof paymentLinksTable.$inferSelect;

type PostgresPaymentLinksOptions = {
  clock: Clock;
  database: DatabaseClient;
};

export class PostgresPaymentLinks implements PaymentLinks, CheckoutSessions {
  constructor(private readonly options: PostgresPaymentLinksOptions) {}

  async findByTokenSha256(tokenSha256: string): Promise<PaymentLink | null> {
    const [row] = await this.options.database
      .select()
      .from(paymentLinksTable)
      .where(eq(paymentLinksTable.tokenSha256, tokenSha256))
      .limit(1);

    return row ? toPaymentLink(row) : null;
  }

  async issue(link: NewPaymentLink): Promise<PaymentLink> {
    const [row] = await this.options.database
      .insert(paymentLinksTable)
      .values({
        assessmentCallId: link.assessmentCallId,
        tokenSha256: link.tokenSha256,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt,
      })
      .returning();

    if (!row) {
      throw new Error("Payment link issue returned no row.");
    }

    return toPaymentLink(row);
  }

  async voidOtherLinksOf(
    assessmentCallId: string,
    keepId: string,
  ): Promise<void> {
    await this.options.database
      .update(paymentLinksTable)
      .set({ state: "voided" })
      .where(
        and(
          eq(paymentLinksTable.assessmentCallId, assessmentCallId),
          ne(paymentLinksTable.id, keepId),
          eq(paymentLinksTable.state, "valid"),
        ),
      );
  }

  async void(id: string): Promise<void> {
    await this.options.database
      .update(paymentLinksTable)
      .set({ state: "voided" })
      .where(
        and(eq(paymentLinksTable.id, id), eq(paymentLinksTable.state, "valid")),
      );
  }

  async findPaymentCustomerForCall(
    assessmentCallId: string,
  ): Promise<string | null> {
    const [row] = await this.options.database
      .select({ paymentCustomerId: paymentLinksTable.stripeCustomerId })
      .from(paymentLinksTable)
      .where(
        and(
          eq(paymentLinksTable.assessmentCallId, assessmentCallId),
          isNotNull(paymentLinksTable.stripeCustomerId),
        ),
      )
      .orderBy(desc(paymentLinksTable.createdAt))
      .limit(1);

    return row?.paymentCustomerId ?? null;
  }

  async rememberPaymentCustomer(
    paymentLinkId: string,
    paymentCustomerId: string,
  ): Promise<void> {
    await this.options.database
      .update(paymentLinksTable)
      .set({ stripeCustomerId: paymentCustomerId })
      .where(eq(paymentLinksTable.id, paymentLinkId));
  }

  async remember(session: CheckoutSessionRecord): Promise<void> {
    await this.options.database.insert(checkoutSessionsTable).values({
      id: session.id,
      paymentLinkId: session.paymentLinkId,
      bundleId: session.bundleId,
      tier: session.tier,
      amountCents: session.amountCents,
      currency: session.currency,
      startChoice: session.startChoice,
      createdAt: session.createdAt,
    });
  }

  async findOpenForCall(
    assessmentCallId: string,
  ): Promise<readonly { id: string }[]> {
    return this.options.database
      .select({ id: checkoutSessionsTable.id })
      .from(checkoutSessionsTable)
      .innerJoin(
        paymentLinksTable,
        eq(paymentLinksTable.id, checkoutSessionsTable.paymentLinkId),
      )
      .where(
        and(
          eq(paymentLinksTable.assessmentCallId, assessmentCallId),
          isNull(checkoutSessionsTable.expiredAt),
        ),
      );
  }

  async markExpired(id: string): Promise<void> {
    await this.options.database
      .update(checkoutSessionsTable)
      .set({ expiredAt: this.options.clock.now() })
      .where(
        and(
          eq(checkoutSessionsTable.id, id),
          isNull(checkoutSessionsTable.expiredAt),
        ),
      );
  }
}

function toPaymentLink(row: PaymentLinkRow): PaymentLink {
  return PaymentLink.reconstitute({
    id: row.id,
    assessmentCallId: row.assessmentCallId,
    tokenSha256: row.tokenSha256,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    state: row.state,
    paymentCustomerId: row.stripeCustomerId,
  });
}
