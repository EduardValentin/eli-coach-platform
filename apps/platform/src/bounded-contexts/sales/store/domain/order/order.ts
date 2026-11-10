import type { StoreConsentVersions } from "../acquisition";
import type { PublishedProduct, StoreCurrency } from "../product";
import type { StoreRecipientEmail } from "../store-recipient-email";

import { DeliveryConsent } from "./delivery-consent";
import type { OrderCheckout } from "./order-checkout";
import { OrderConsents } from "./order-consents";
import { OrderItem, type OrderLine } from "./order-item";
import type { OrderPayment } from "./order-payment";
import type { OrderRequest } from "./order-request";

const EMAIL_ATTEMPT_TOKEN_PREFIX_LENGTH = 24;

export const STORE_ORDER_PURPOSE = "store-order";

export type OrderStatus = "pending" | "paid";

export type OrderConfirmation = {
  email: string;
  currency: StoreCurrency;
  lines: readonly OrderLine[];
  totalMinorUnits: number;
  termsVersion: string;
};

export type OrderPlacement =
  | { status: "placed"; order: Order }
  | {
      status: "unavailable_products";
      availableProductSlugs: readonly string[];
    }
  | { status: "no_paid_items" };

export type OrderPaymentOutcome =
  | { status: "paid"; order: Order }
  | { status: "already_paid" }
  | { status: "session_mismatch" };

type PlaceOrderInput = {
  id: string;
  request: OrderRequest;
  catalog: readonly PublishedProduct[];
  consentVersions: StoreConsentVersions;
  payloadDigest: string;
  placedAt: Date;
};

type OrderProps = {
  id: string;
  recipientEmail: StoreRecipientEmail;
  currency: StoreCurrency;
  items: readonly OrderItem[];
  status: OrderStatus;
  checkout: OrderCheckout | null;
  payment: OrderPayment | null;
  consents: OrderConsents;
  deliveryConsent: DeliveryConsent;
  idempotencyKey: string;
  payloadDigest: string;
  placedAt: Date;
};

export class Order {
  readonly id: string;
  readonly recipientEmail: StoreRecipientEmail;
  readonly currency: StoreCurrency;
  readonly items: readonly OrderItem[];
  readonly status: OrderStatus;
  readonly checkout: OrderCheckout | null;
  readonly payment: OrderPayment | null;
  readonly consents: OrderConsents;
  readonly deliveryConsent: DeliveryConsent;
  readonly idempotencyKey: string;
  readonly payloadDigest: string;
  readonly placedAt: Date;

  private constructor(props: OrderProps) {
    this.id = props.id;
    this.recipientEmail = props.recipientEmail;
    this.currency = props.currency;
    this.items = props.items;
    this.status = props.status;
    this.checkout = props.checkout;
    this.payment = props.payment;
    this.consents = props.consents;
    this.deliveryConsent = props.deliveryConsent;
    this.idempotencyKey = props.idempotencyKey;
    this.payloadDigest = props.payloadDigest;
    this.placedAt = props.placedAt;
  }

  static place(input: PlaceOrderInput): OrderPlacement {
    const { request } = input;
    const productsBySlug = new Map(
      input.catalog.map((product) => [product.slug, product]),
    );
    const availableProductSlugs = request.productSlugs.filter((slug) =>
      productsBySlug.has(slug),
    );

    if (availableProductSlugs.length !== request.productSlugs.length) {
      return { status: "unavailable_products", availableProductSlugs };
    }

    const items = availableProductSlugs.map((slug) =>
      OrderItem.priced(productsBySlug.get(slug)!, request.currency),
    );

    if (!items.some((item) => item.isPaid())) {
      return { status: "no_paid_items" };
    }

    return {
      status: "placed",
      order: new Order({
        id: input.id,
        recipientEmail: request.recipientEmail,
        currency: request.currency,
        items,
        status: "pending",
        checkout: null,
        payment: null,
        consents: OrderConsents.given({
          versions: input.consentVersions,
          marketingConsent: request.marketingConsent,
          at: input.placedAt,
        }),
        deliveryConsent: DeliveryConsent.given({
          termsVersion: input.consentVersions.paidDeliveryConsentTermsVersion,
          consentedAt: input.placedAt,
        }),
        idempotencyKey: request.idempotencyKey,
        payloadDigest: input.payloadDigest,
        placedAt: input.placedAt,
      }),
    };
  }

  static reconstitute(props: OrderProps): Order {
    return new Order(props);
  }

  get email(): string {
    return this.recipientEmail.address;
  }

  get deliveryLimitKey(): string {
    return this.recipientEmail.deliveryLimitKey();
  }

  total(): number {
    return this.items.reduce((sum, item) => sum + item.amountMinorUnits, 0);
  }

  paidItems(): readonly OrderItem[] {
    return this.items.filter((item) => item.isPaid());
  }

  emailAttemptKey(tokenSha256: string): string {
    return `${this.id}-${tokenSha256.slice(0, EMAIL_ATTEMPT_TOKEN_PREFIX_LENGTH)}`;
  }

  replays(payloadDigest: string): boolean {
    return this.payloadDigest === payloadDigest;
  }

  markPaid(payment: OrderPayment): OrderPaymentOutcome {
    if (!this.checkout?.holdsSession(payment.checkoutSessionId)) {
      return { status: "session_mismatch" };
    }

    if (this.status === "paid") {
      return { status: "already_paid" };
    }

    return {
      status: "paid",
      order: new Order({ ...this.props(), status: "paid", payment }),
    };
  }

  chargeDiffers(payment: OrderPayment): boolean {
    return !payment.covers(this.total(), this.currency);
  }

  confirmation(): OrderConfirmation {
    return {
      email: this.email,
      currency: this.currency,
      lines: this.items.map((item) => item.line()),
      totalMinorUnits: this.total(),
      termsVersion: this.consents.termsVersion,
    };
  }

  private props(): OrderProps {
    return {
      id: this.id,
      recipientEmail: this.recipientEmail,
      currency: this.currency,
      items: this.items,
      status: this.status,
      checkout: this.checkout,
      payment: this.payment,
      consents: this.consents,
      deliveryConsent: this.deliveryConsent,
      idempotencyKey: this.idempotencyKey,
      payloadDigest: this.payloadDigest,
      placedAt: this.placedAt,
    };
  }
}
