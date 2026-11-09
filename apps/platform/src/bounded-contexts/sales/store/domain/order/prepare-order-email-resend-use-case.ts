import {
  STORE_DELIVERY_LIMIT_POLICY,
  type DownloadTokenGeneratorPort,
} from "../acquisition";
import type { ClockPort } from "../clock-port";

import type { OrderDeliveryPort } from "./order-delivery-port";
import { OrderEmailAttempt } from "./order-email-attempt";
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
    const attempt = OrderEmailAttempt.reissue({
      order,
      token: this.options.downloadTokenGeneratorPort.create(),
      orderDeliveryPort: this.options.orderDeliveryPort,
    });
    const preparation = await this.options.storeOrdersPort.prepareResend({
      attempt,
      at,
      windows: STORE_DELIVERY_LIMIT_POLICY.windowsAt(at),
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
      delivery: attempt.toDelivery({
        deliveryAttemptId: preparation.deliveryAttemptId,
        at,
      }),
    };
  }
}
