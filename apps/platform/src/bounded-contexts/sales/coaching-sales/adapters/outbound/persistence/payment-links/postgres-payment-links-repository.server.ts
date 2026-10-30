import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import type {
  CheckoutSessionRecord,
  CheckoutSessionsPort,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import {
  PaymentLink,
  type PaymentLinksPort,
} from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";
import type { ClockPort } from "~/bounded-contexts/sales/coaching-sales/domain/clock-port";
import { and, desc, eq, isNotNull, isNull, ne } from "drizzle-orm";

import {
  checkoutSessionsTable,
  paymentLinksTable,
} from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/schema.server";

type PaymentLinkRow = typeof paymentLinksTable.$inferSelect;

type PostgresPaymentLinksOptions = {
  clockPort: ClockPort;
  database: DatabaseClient;
};

export class PostgresPaymentLinksRepository
  implements PaymentLinksPort, CheckoutSessionsPort
{
  constructor(private readonly options: PostgresPaymentLinksOptions) {}

  private get executor() {
    return executorOf(this.options.database);
  }

  async findByTokenSha256(tokenSha256: string): Promise<PaymentLink | null> {
    const [row] = await this.executor
      .select()
      .from(paymentLinksTable)
      .where(eq(paymentLinksTable.tokenSha256, tokenSha256))
      .limit(1);

    return row ? toPaymentLink(row) : null;
  }

  async issue(link: PaymentLink): Promise<void> {
    await this.executor.insert(paymentLinksTable).values({
      id: link.id,
      assessmentCallId: link.assessmentCallId,
      tokenSha256: link.tokenSha256,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      state: link.state,
      stripeCustomerId: link.paymentCustomerId,
    });
  }

  async voidOtherLinksOf(
    assessmentCallId: string,
    keepId: string,
  ): Promise<void> {
    await this.executor
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
    await this.executor
      .update(paymentLinksTable)
      .set({ state: "voided" })
      .where(
        and(eq(paymentLinksTable.id, id), eq(paymentLinksTable.state, "valid")),
      );
  }

  async findPaymentCustomerForCall(
    assessmentCallId: string,
  ): Promise<string | null> {
    const [row] = await this.executor
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
    await this.executor
      .update(paymentLinksTable)
      .set({ stripeCustomerId: paymentCustomerId })
      .where(eq(paymentLinksTable.id, paymentLinkId));
  }

  async remember(session: CheckoutSessionRecord): Promise<void> {
    await this.executor.insert(checkoutSessionsTable).values({
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
    return this.executor
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
    await this.executor
      .update(checkoutSessionsTable)
      .set({ expiredAt: this.options.clockPort.now() })
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
