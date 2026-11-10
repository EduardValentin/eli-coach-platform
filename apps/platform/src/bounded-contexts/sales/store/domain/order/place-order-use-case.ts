import type {
  ConsentVersionsPort,
  PayloadDigestGeneratorPort,
} from "../acquisition";
import type { ClockPort } from "../clock-port";
import type { EmailAcceptancePort } from "../email-acceptance-port";
import type { PublishedProduct, StoreCatalogPort } from "../product";

import { Order } from "./order";
import { OrderCheckout } from "./order-checkout";
import type { OrderIdsPort } from "./order-ids-port";
import { OrderRequest, type PlaceOrderCommand } from "./order-request";
import type { StoreCheckoutPort } from "./store-checkout-port";
import type { StoreOrdersPort } from "./store-orders-port";

export type PlaceOrderResult =
  | { status: "opened"; checkoutUrl: string }
  | { status: "paid"; checkoutSessionId: string }
  | { status: "idempotency_conflict" }
  | { status: "subaddress_refused" }
  | {
      status: "unavailable_products";
      availableProductSlugs: readonly string[];
    }
  | { status: "no_paid_items" }
  | { status: "checkout_unavailable" };

type CheckoutReturnUrls = {
  successUrl: string;
  cancelUrl: string;
};

type PlaceOrderUseCaseOptions = {
  storeOrdersPort: StoreOrdersPort;
  storeCatalogPort: StoreCatalogPort;
  storeCheckoutPort: StoreCheckoutPort;
  clockPort: ClockPort;
  consentVersionsPort: ConsentVersionsPort;
  emailAcceptancePort: EmailAcceptancePort;
  payloadDigestGeneratorPort: PayloadDigestGeneratorPort;
  orderIdsPort: OrderIdsPort;
};

export class PlaceOrderUseCase {
  constructor(private readonly options: PlaceOrderUseCaseOptions) {}

  async execute(
    command: PlaceOrderCommand & CheckoutReturnUrls,
  ): Promise<PlaceOrderResult> {
    const request = OrderRequest.from(
      command,
      this.options.emailAcceptancePort,
    );

    if (!this.options.emailAcceptancePort.accepts(request.email)) {
      return { status: "subaddress_refused" };
    }

    const payloadDigest = this.options.payloadDigestGeneratorPort.digest(
      request.canonicalPayload(),
    );
    const existing = await this.options.storeOrdersPort.findByIdempotencyKey(
      request.idempotencyKey,
    );

    if (existing) {
      return this.resume(existing, { payloadDigest, urls: command });
    }

    const catalog = await this.loadCatalog();

    if (catalog === null) {
      return { status: "checkout_unavailable" };
    }

    const placement = Order.place({
      id: this.options.orderIdsPort.generate(),
      request,
      catalog,
      consentVersions: this.options.consentVersionsPort.current(),
      payloadDigest,
      placedAt: this.options.clockPort.now(),
    });

    if (placement.status !== "placed") {
      return placement;
    }

    const recording = await this.options.storeOrdersPort.place(placement.order);

    if (recording.status === "unavailable_products") {
      return recording;
    }

    if (recording.status === "exists") {
      return this.resume(recording.order, { payloadDigest, urls: command });
    }

    return this.openCheckout(placement.order, command);
  }

  private async resume(
    order: Order,
    submission: { payloadDigest: string; urls: CheckoutReturnUrls },
  ): Promise<PlaceOrderResult> {
    if (!order.replays(submission.payloadDigest)) {
      return { status: "idempotency_conflict" };
    }

    if (order.payment) {
      return {
        status: "paid",
        checkoutSessionId: order.payment.checkoutSessionId,
      };
    }

    if (order.checkout) {
      return { status: "opened", checkoutUrl: order.checkout.url };
    }

    return this.openCheckout(order, submission.urls);
  }

  private async openCheckout(
    order: Order,
    urls: CheckoutReturnUrls,
  ): Promise<PlaceOrderResult> {
    let checkout: Awaited<ReturnType<StoreCheckoutPort["open"]>>;

    try {
      checkout = await this.options.storeCheckoutPort.open({
        orderId: order.id,
        email: order.email,
        currency: order.currency,
        lines: order.paidItems().map((item) => ({
          title: item.title,
          amountMinorUnits: item.amountMinorUnits,
        })),
        successUrl: urls.successUrl,
        cancelUrl: urls.cancelUrl,
      });
    } catch {
      return { status: "checkout_unavailable" };
    }

    await this.options.storeOrdersPort.attachCheckout({
      orderId: order.id,
      checkout: OrderCheckout.opened(checkout),
    });

    return { status: "opened", checkoutUrl: checkout.url };
  }

  private async loadCatalog(): Promise<readonly PublishedProduct[] | null> {
    try {
      return await this.options.storeCatalogPort.getPublishedCatalog();
    } catch {
      return null;
    }
  }
}
