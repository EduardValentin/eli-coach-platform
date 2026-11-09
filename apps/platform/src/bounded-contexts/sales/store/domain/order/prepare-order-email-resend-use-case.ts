import {
  STORE_DELIVERY_LIMIT_POLICY,
  type DownloadTokenGeneratorPort,
} from "../acquisition";
import type { ClockPort } from "../clock-port";

import type { OrderDeliveryPort } from "./order-delivery-port";
import type { OrderEmailDelivery } from "./order-email-delivery";
import type { StoreOrdersPort } from "./store-orders-port";

export type PrepareOrderEmailResendResult =
  | { status: "prepared"; delivery: OrderEmailDelivery }
  | { status: "processing" }
  | { status: "rate_limited" }
  | { status: "not_found" };

type PrepareOrderEmailResendUseCaseOptions = {
  storeOrdersPort: StoreOrdersPort;
  clockPort: ClockPort;
  downloadTokenGeneratorPort: DownloadTokenGeneratorPort;
  orderDeliveryPort: Pick<
    OrderDeliveryPort,
    "provider" | "createProviderIdempotencyKey"
  >;
};

export class PrepareOrderEmailResendUseCase {
  constructor(
    private readonly options: PrepareOrderEmailResendUseCaseOptions,
  ) {}

  async execute(sessionId: string): Promise<PrepareOrderEmailResendResult> {
    const order =
      await this.options.storeOrdersPort.findByCheckoutSession(sessionId);

    if (!order) {
      return { status: "not_found" };
    }

    if (order.status !== "paid") {
      return { status: "processing" };
    }

    const at = this.options.clockPort.now();
    const token = this.options.downloadTokenGeneratorPort.create();
    const attempt = {
      provider: this.options.orderDeliveryPort.provider,
      providerIdempotencyKey:
        this.options.orderDeliveryPort.createProviderIdempotencyKey(
          order.emailAttemptKey(token.sha256),
        ),
    };
    const preparation = await this.options.storeOrdersPort.prepareResend({
      orderId: order.id,
      tokenSha256: token.sha256,
      attempt,
      at,
      cooldownSince: new Date(
        at.getTime() - STORE_DELIVERY_LIMIT_POLICY.cooldownMs,
      ),
      dailyWindowSince: new Date(
        at.getTime() - STORE_DELIVERY_LIMIT_POLICY.dailyWindowMs,
      ),
      dailyLimit: STORE_DELIVERY_LIMIT_POLICY.dailyLimit,
    });

    if (preparation.status === "rate_limited") {
      return { status: "rate_limited" };
    }

    if (preparation.status === "grant_unavailable") {
      return { status: "not_found" };
    }

    return {
      status: "prepared",
      delivery: {
        order,
        deliveryAttemptId: preparation.deliveryAttemptId,
        ...attempt,
        rawToken: token.rawToken,
        at,
      },
    };
  }
}
