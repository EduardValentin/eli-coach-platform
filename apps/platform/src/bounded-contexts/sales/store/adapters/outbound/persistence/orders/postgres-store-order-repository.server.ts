import { evaluateDeliveryLimit } from "~/bounded-contexts/sales/store/domain/acquisition";
import {
  DeliveryConsent,
  Order,
  OrderCheckout,
  OrderConsents,
  OrderItem,
  OrderPayment,
  type AttachOrderCheckoutCommand,
  type OrderEmailAttempt,
  type OrderRecording,
  type OrderResendPreparation,
  type PrepareOrderResendCommand,
  type RecordPaymentWithGrantCommand,
  type RotateGrantTokenCommand,
  type StoreOrdersPort,
} from "~/bounded-contexts/sales/store/domain/order";
import {
  Product,
  type StoreCurrency,
} from "~/bounded-contexts/sales/store/domain/product";
import { StoreRecipientEmail } from "~/bounded-contexts/sales/store/domain/store-recipient-email";
import { sql, type SQL } from "drizzle-orm";

import {
  isCausedByDatabaseError,
  type DatabaseClient,
  type DatabaseExecutor,
} from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";

type OrderRow = {
  id: string;
  email: string;
  currency: StoreCurrency;
  status: "pending" | "paid";
  checkoutSessionId: string | null;
  checkoutUrl: string | null;
  paymentIntentId: string | null;
  chargedMinorUnits: number | null;
  chargedCurrency: string | null;
  paidAt: Date | string | null;
  termsVersion: string;
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
  marketingConsent: boolean;
  marketingConsentedAt: Date | string | null;
  deliveryConsentTermsVersion: string;
  deliveryConsentedAt: Date | string;
  idempotencyKey: string;
  payloadDigest: string;
  placedAt: Date | string;
};

type OrderItemRow = {
  productId: number;
  productSlug: string;
  productVersionId: number;
  title: string;
  amountMinorUnits: number;
};

type LockedProductRow = {
  id: number;
  lifecycleStatus: "draft" | "published" | "archived";
  slug: string;
  currentVersionId: number | null;
};

type IdRow = {
  id: number;
};

type AttemptUsageRow = {
  cooldownCount: string;
  dailyCount: string;
};

const UNIQUE_VIOLATION = "23505";
const IDEMPOTENCY_KEY_CONSTRAINT = "store_orders_idempotency_key_unique";

export class PostgresStoreOrderRepository implements StoreOrdersPort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor(): DatabaseExecutor {
    return executorOf(this.database);
  }

  findByIdempotencyKey(idempotencyKey: string): Promise<Order | null> {
    return this.loadOrder(
      this.executor,
      sql`store_order.idempotency_key = ${idempotencyKey}`,
    );
  }

  findByCheckoutSession(sessionId: string): Promise<Order | null> {
    return this.loadOrder(
      this.executor,
      sql`store_order.checkout_session_id = ${sessionId}`,
    );
  }

  lockForPayment(orderId: string): Promise<Order | null> {
    return this.loadOrder(
      this.executor,
      sql`store_order.id = ${orderId} for update of store_order`,
    );
  }

  async place(order: Order): Promise<OrderRecording> {
    try {
      return await this.executor.transaction((transaction) =>
        this.placeInTransaction(transaction, order),
      );
    } catch (error) {
      if (!this.isIdempotencyKeyRace(error)) {
        throw error;
      }

      const existing = await this.findByIdempotencyKey(order.idempotencyKey);

      if (!existing) {
        throw error;
      }

      return { status: "exists", order: existing };
    }
  }

  async attachCheckout(command: AttachOrderCheckoutCommand): Promise<void> {
    await this.executor.execute(sql`
      update app.store_orders
      set checkout_session_id = ${command.checkout.sessionId},
        checkout_url = ${command.checkout.url},
        updated_at = now()
      where id = ${command.orderId}
        and checkout_session_id is null
    `);
  }

  recordPaymentWithGrant(
    command: RecordPaymentWithGrantCommand,
  ): Promise<{ deliveryAttemptId: number }> {
    return this.executor.transaction(async (transaction) => {
      await this.markPaid(transaction, command);
      await this.insertGrant(transaction, command);

      return {
        deliveryAttemptId: await this.insertAttempt(transaction, {
          attempt: command.attempt,
          at: command.at,
        }),
      };
    });
  }

  prepareResend(
    command: PrepareOrderResendCommand,
  ): Promise<OrderResendPreparation> {
    const orderId = command.attempt.order.id;

    return this.executor.transaction(async (transaction) => {
      const grant = await transaction.execute<IdRow>(sql`
        select id
        from app.download_grants
        where order_id = ${orderId}
          and status = 'active'
          and expires_at > ${command.at}
        for update
      `);

      if (grant.rows.length === 0) {
        return { status: "grant_unavailable" };
      }

      const usage = await transaction.execute<AttemptUsageRow>(sql`
        select
          count(*) filter (
            where created_at > ${command.windows.cooldownSince}
          ) as "cooldownCount",
          count(*) as "dailyCount"
        from app.delivery_attempts
        where order_id = ${orderId}
          and created_at > ${command.windows.dailyWindowSince}
          and status in ('pending', 'accepted')
      `);
      const [counts] = usage.rows;
      const limitedWindow = evaluateDeliveryLimit(
        {
          cooldownCount: Number(counts?.cooldownCount ?? 0),
          dailyCount: Number(counts?.dailyCount ?? 0),
        },
        command.dailyLimit,
      );

      if (limitedWindow) {
        return { status: "rate_limited", window: limitedWindow };
      }

      return {
        status: "prepared",
        deliveryAttemptId: await this.insertAttempt(transaction, command),
      };
    });
  }

  async rotateGrantToken(command: RotateGrantTokenCommand): Promise<void> {
    const rotated = await this.executor.execute<IdRow>(sql`
      update app.download_grants
      set token_sha256 = ${command.tokenSha256}
      where order_id = ${command.orderId}
        and status = 'active'
      returning id
    `);

    if (rotated.rows.length === 0) {
      throw new Error("The order holds no active grant to rotate.");
    }
  }

  async recordEmailAccepted(command: {
    deliveryAttemptId: number;
    provider: string;
    providerMessageId: string;
  }): Promise<void> {
    await this.executor.execute(sql`
      update app.delivery_attempts
      set status = 'accepted',
        provider_message_id = ${command.providerMessageId},
        updated_at = now()
      where id = ${command.deliveryAttemptId}
        and order_id is not null
        and provider = ${command.provider}
        and status = 'pending'
    `);
  }

  async recordEmailRejected(command: {
    deliveryAttemptId: number;
  }): Promise<void> {
    await this.settleAttempt(command.deliveryAttemptId, "rejected");
  }

  async recordEmailRetryable(command: {
    deliveryAttemptId: number;
  }): Promise<void> {
    await this.settleAttempt(command.deliveryAttemptId, "retryable");
  }

  private async settleAttempt(
    deliveryAttemptId: number,
    status: "rejected" | "retryable",
  ): Promise<void> {
    await this.executor.execute(sql`
      update app.delivery_attempts
      set status = ${status},
        updated_at = now()
      where id = ${deliveryAttemptId}
        and order_id is not null
        and status = 'pending'
    `);
  }

  private async placeInTransaction(
    transaction: DatabaseExecutor,
    order: Order,
  ): Promise<OrderRecording> {
    const existing = await this.loadOrder(
      transaction,
      sql`store_order.idempotency_key = ${order.idempotencyKey} for update of store_order`,
    );

    if (existing) {
      return { status: "exists", order: existing };
    }

    const purchasability = await this.lockPurchasability(transaction, order);

    if (purchasability.status === "unavailable") {
      return {
        status: "unavailable_products",
        availableProductSlugs: purchasability.purchasableSlugs,
      };
    }

    const recipientId = await this.upsertRecipient(transaction, order);
    await this.insertOrder(transaction, { order, recipientId });
    await this.insertItems(transaction, order);

    return { status: "placed" };
  }

  private async upsertRecipient(
    transaction: DatabaseExecutor,
    order: Order,
  ): Promise<number> {
    return this.requiredId(
      await transaction.execute<IdRow>(sql`
        insert into app.store_recipients (
          normalized_email,
          delivery_limit_key,
          updated_at
        )
        values (${order.email}, ${order.deliveryLimitKey}, ${order.placedAt})
        on conflict (normalized_email)
        do update set updated_at = excluded.updated_at
        returning id
      `),
    );
  }

  private async insertOrder(
    transaction: DatabaseExecutor,
    placement: { order: Order; recipientId: number },
  ): Promise<void> {
    const { order, recipientId } = placement;
    const consents = order.consents.toSnapshot();

    await transaction.execute(sql`
      insert into app.store_orders (
        id,
        recipient_id,
        idempotency_key,
        payload_digest,
        currency,
        status,
        terms_version,
        privacy_policy_version,
        marketing_consent_version,
        marketing_consent,
        marketing_consented_at,
        delivery_consent_terms_version,
        delivery_consented_at,
        placed_at,
        updated_at
      )
      values (
        ${order.id},
        ${recipientId},
        ${order.idempotencyKey},
        ${order.payloadDigest},
        ${order.currency},
        'pending',
        ${consents.termsVersion},
        ${consents.privacyPolicyVersion},
        ${consents.marketingConsentVersion},
        ${consents.marketingConsent},
        ${consents.marketingConsentedAt},
        ${order.deliveryConsent.termsVersion},
        ${order.deliveryConsent.consentedAt},
        ${order.placedAt},
        ${order.placedAt}
      )
    `);
  }

  private async insertItems(
    transaction: DatabaseExecutor,
    order: Order,
  ): Promise<void> {
    for (const [position, item] of order.items.entries()) {
      await transaction.execute(sql`
        insert into app.store_order_items (
          order_id,
          position,
          product_id,
          product_version_id,
          title,
          amount_minor_units
        )
        values (
          ${order.id},
          ${position},
          ${item.productId},
          ${item.productVersionId},
          ${item.title},
          ${item.amountMinorUnits}
        )
      `);
    }
  }

  private async markPaid(
    transaction: DatabaseExecutor,
    command: RecordPaymentWithGrantCommand,
  ): Promise<void> {
    const { order } = command.attempt;
    const payment = order.payment;

    if (!payment) {
      throw new Error("Only a paid order records its payment.");
    }

    const paid = await transaction.execute<{ id: string }>(sql`
      update app.store_orders
      set status = 'paid',
        payment_intent_id = ${payment.paymentIntentId},
        charged_minor_units = ${payment.amountMinorUnits},
        charged_currency = ${payment.currency},
        paid_at = ${payment.paidAt},
        updated_at = ${command.at}
      where id = ${order.id}
        and status = 'pending'
        and checkout_session_id = ${payment.checkoutSessionId}
      returning id
    `);

    if (paid.rows.length === 0) {
      throw new Error("The order was paid meanwhile or under another session.");
    }
  }

  private async insertGrant(
    transaction: DatabaseExecutor,
    command: RecordPaymentWithGrantCommand,
  ): Promise<void> {
    const { order } = command.attempt;
    const grantId = this.requiredId(
      await transaction.execute<IdRow>(sql`
        insert into app.download_grants (
          order_id,
          token_sha256,
          status,
          expires_at,
          created_at
        )
        values (
          ${order.id},
          ${command.attempt.toSnapshot().tokenSha256},
          'active',
          ${command.grantExpiresAt},
          ${command.at}
        )
        returning id
      `),
    );

    for (const item of order.items) {
      await transaction.execute(sql`
        insert into app.download_grant_items (grant_id, product_version_id)
        values (${grantId}, ${item.productVersionId})
      `);
    }
  }

  private async lockPurchasability(
    transaction: DatabaseExecutor,
    order: Order,
  ) {
    const productIds = order.items.map((item) => item.productId);
    const locked = await transaction.execute<LockedProductRow>(sql`
      select
        product.id,
        product.lifecycle_status as "lifecycleStatus",
        product.slug,
        (
          select version.id
          from app.product_versions version
          where version.product_id = product.id
            and version.published_at is not null
          order by version.sequence desc
          limit 1
        ) as "currentVersionId"
      from app.products product
      where product.id in (
        select value::integer
        from jsonb_array_elements_text(${JSON.stringify(productIds)}::jsonb)
      )
      order by product.id
      for update of product
    `);

    return Product.evaluatePurchasability(
      order.items.map((item) => ({
        productId: item.productId,
        slug: item.productSlug,
        pinnedVersionId: item.productVersionId,
      })),
      locked.rows.map((row) => ({
        productId: row.id,
        slug: row.slug,
        lifecycleStatus: row.lifecycleStatus,
        currentVersionId: row.currentVersionId,
      })),
    );
  }

  private async insertAttempt(
    transaction: DatabaseExecutor,
    recording: { attempt: OrderEmailAttempt; at: Date },
  ): Promise<number> {
    const attempt = recording.attempt.toSnapshot();

    return this.requiredId(
      await transaction.execute<IdRow>(sql`
        insert into app.delivery_attempts (
          order_id,
          provider,
          provider_idempotency_key,
          status,
          created_at,
          updated_at
        )
        values (
          ${attempt.orderId},
          ${attempt.provider},
          ${attempt.providerIdempotencyKey},
          'pending',
          ${recording.at},
          ${recording.at}
        )
        returning id
      `),
    );
  }

  private async loadOrder(
    executor: DatabaseExecutor,
    condition: SQL,
  ): Promise<Order | null> {
    const orders = await executor.execute<OrderRow>(sql`
      select
        store_order.id,
        recipient.normalized_email as "email",
        store_order.currency,
        store_order.status,
        store_order.checkout_session_id as "checkoutSessionId",
        store_order.checkout_url as "checkoutUrl",
        store_order.payment_intent_id as "paymentIntentId",
        store_order.charged_minor_units as "chargedMinorUnits",
        store_order.charged_currency as "chargedCurrency",
        store_order.paid_at as "paidAt",
        store_order.terms_version as "termsVersion",
        store_order.privacy_policy_version as "privacyPolicyVersion",
        store_order.marketing_consent_version as "marketingConsentVersion",
        store_order.marketing_consent as "marketingConsent",
        store_order.marketing_consented_at as "marketingConsentedAt",
        store_order.delivery_consent_terms_version as "deliveryConsentTermsVersion",
        store_order.delivery_consented_at as "deliveryConsentedAt",
        store_order.idempotency_key as "idempotencyKey",
        store_order.payload_digest as "payloadDigest",
        store_order.placed_at as "placedAt"
      from app.store_orders store_order
      join app.store_recipients recipient
        on recipient.id = store_order.recipient_id
      where ${condition}
    `);
    const [row] = orders.rows;

    if (!row) {
      return null;
    }

    const items = await executor.execute<OrderItemRow>(sql`
      select
        item.product_id as "productId",
        product.slug as "productSlug",
        item.product_version_id as "productVersionId",
        item.title,
        item.amount_minor_units as "amountMinorUnits"
      from app.store_order_items item
      join app.products product on product.id = item.product_id
      where item.order_id = ${row.id}
      order by item.position
    `);

    return this.toOrder(row, items.rows);
  }

  private toOrder(row: OrderRow, items: readonly OrderItemRow[]): Order {
    return Order.reconstitute({
      id: row.id,
      recipientEmail: StoreRecipientEmail.reconstitute({ address: row.email }),
      currency: row.currency,
      items: items.map((item) => OrderItem.reconstitute(item)),
      status: row.status,
      checkout:
        row.checkoutSessionId !== null && row.checkoutUrl !== null
          ? OrderCheckout.reconstitute({
              sessionId: row.checkoutSessionId,
              url: row.checkoutUrl,
            })
          : null,
      payment: this.toPayment(row),
      consents: OrderConsents.reconstitute({
        termsVersion: row.termsVersion,
        privacyPolicyVersion: row.privacyPolicyVersion,
        marketingConsentVersion: row.marketingConsentVersion,
        marketingConsent: row.marketingConsent,
        marketingConsentedAt:
          row.marketingConsentedAt === null
            ? null
            : new Date(row.marketingConsentedAt),
      }),
      deliveryConsent: DeliveryConsent.reconstitute({
        termsVersion: row.deliveryConsentTermsVersion,
        consentedAt: new Date(row.deliveryConsentedAt),
      }),
      idempotencyKey: row.idempotencyKey,
      payloadDigest: row.payloadDigest,
      placedAt: new Date(row.placedAt),
    });
  }

  private toPayment(row: OrderRow): OrderPayment | null {
    if (
      row.status !== "paid" ||
      row.checkoutSessionId === null ||
      row.chargedMinorUnits === null ||
      row.chargedCurrency === null ||
      row.paidAt === null
    ) {
      return null;
    }

    return OrderPayment.reconstitute({
      checkoutSessionId: row.checkoutSessionId,
      paymentIntentId: row.paymentIntentId,
      amountMinorUnits: row.chargedMinorUnits,
      currency: row.chargedCurrency,
      paidAt: new Date(row.paidAt),
    });
  }

  private requiredId(result: { rows: readonly IdRow[] }): number {
    const [row] = result.rows;

    if (!row) {
      throw new Error("The insert returned no identifier.");
    }

    return row.id;
  }

  private isIdempotencyKeyRace(error: unknown): boolean {
    return isCausedByDatabaseError(
      error,
      ({ code, constraint }) =>
        code === UNIQUE_VIOLATION && constraint === IDEMPOTENCY_KEY_CONSTRAINT,
    );
  }
}
