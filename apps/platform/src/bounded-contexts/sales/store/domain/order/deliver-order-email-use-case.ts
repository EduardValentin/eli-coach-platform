import type {
  OrderDeliveryPort,
  OrderDeliveryResult,
} from "./order-delivery-port";
import type { OrderEmailDelivery } from "./order-email-delivery";
import type { OrderIncidentsPort } from "./order-incidents-port";
import type { StoreOrdersPort } from "./store-orders-port";
import type { OrderTermsPort } from "./order-terms-port";

export type DeliverOrderEmailResult = "sent" | "not_sent";

type DeliverOrderEmailUseCaseOptions = {
  storeOrdersPort: StoreOrdersPort;
  orderDeliveryPort: OrderDeliveryPort;
  orderTermsPort: OrderTermsPort;
  orderIncidentsPort: OrderIncidentsPort;
};

export class DeliverOrderEmailUseCase {
  constructor(private readonly options: DeliverOrderEmailUseCaseOptions) {}

  async execute(
    delivery: OrderEmailDelivery,
  ): Promise<DeliverOrderEmailResult> {
    const confirmation = delivery.order.confirmation();
    const terms = this.options.orderTermsPort.find(confirmation.termsVersion);

    if (!terms) {
      this.options.orderIncidentsPort.termsDocumentMissing({
        orderId: delivery.order.id,
        termsVersion: confirmation.termsVersion,
      });

      return this.recordRetryable(delivery);
    }

    let result: OrderDeliveryResult;

    try {
      result = await this.options.orderDeliveryPort.deliver({
        email: confirmation.email,
        idempotencyKey: delivery.providerIdempotencyKey,
        rawToken: delivery.rawToken,
        currency: confirmation.currency,
        lines: confirmation.lines,
        totalMinorUnits: confirmation.totalMinorUnits,
        terms,
        sentAt: delivery.at,
      });
    } catch {
      return this.recordRetryable(delivery);
    }

    if (result.kind === "delivered" && result.provider === delivery.provider) {
      return this.acceptDelivery(delivery, result.providerMessageId);
    }

    if (result.kind === "rejected") {
      return this.recordRejected(delivery, result.reason);
    }

    return this.recordRetryable(delivery);
  }

  private async acceptDelivery(
    delivery: OrderEmailDelivery,
    providerMessageId: string,
  ): Promise<DeliverOrderEmailResult> {
    await this.replaceLinkIfReissued(delivery);

    return this.recordAccepted(delivery, providerMessageId);
  }

  private async replaceLinkIfReissued(
    delivery: OrderEmailDelivery,
  ): Promise<void> {
    if (delivery.linkIssue === "replacement") {
      await this.rotateGrantToken(delivery);
    }
  }

  private async recordAccepted(
    delivery: OrderEmailDelivery,
    providerMessageId: string,
  ): Promise<DeliverOrderEmailResult> {
    try {
      await this.options.storeOrdersPort.recordEmailAccepted({
        deliveryAttemptId: delivery.deliveryAttemptId,
        provider: delivery.provider,
        providerMessageId,
      });
    } catch {
      this.options.orderIncidentsPort.orderEmailAuditPending({
        orderId: delivery.order.id,
      });
    }

    return "sent";
  }

  private async rotateGrantToken(delivery: OrderEmailDelivery): Promise<void> {
    try {
      await this.options.storeOrdersPort.rotateGrantToken({
        orderId: delivery.order.id,
        tokenSha256: delivery.tokenSha256,
      });
    } catch {
      this.options.orderIncidentsPort.orderLinkRotationPending({
        orderId: delivery.order.id,
      });
    }
  }

  private async recordRejected(
    delivery: OrderEmailDelivery,
    reason: string,
  ): Promise<DeliverOrderEmailResult> {
    this.options.orderIncidentsPort.orderEmailRejected({
      orderId: delivery.order.id,
      reason,
    });
    await this.recordOutcome(delivery, () =>
      this.options.storeOrdersPort.recordEmailRejected({
        deliveryAttemptId: delivery.deliveryAttemptId,
      }),
    );

    return "not_sent";
  }

  private async recordRetryable(
    delivery: OrderEmailDelivery,
  ): Promise<DeliverOrderEmailResult> {
    await this.recordOutcome(delivery, () =>
      this.options.storeOrdersPort.recordEmailRetryable({
        deliveryAttemptId: delivery.deliveryAttemptId,
      }),
    );

    return "not_sent";
  }

  private async recordOutcome(
    delivery: OrderEmailDelivery,
    record: () => Promise<void>,
  ): Promise<void> {
    try {
      await record();
    } catch {
      this.options.orderIncidentsPort.orderEmailAuditPending({
        orderId: delivery.order.id,
      });
    }
  }
}
