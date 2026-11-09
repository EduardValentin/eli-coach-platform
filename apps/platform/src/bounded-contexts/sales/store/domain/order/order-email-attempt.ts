import type { CreateDownloadTokenResult } from "../acquisition";

import type { Order } from "./order";
import type { OrderDeliveryPort } from "./order-delivery-port";
import type {
  OrderEmailDelivery,
  OrderGrantToken,
} from "./order-email-delivery";

export type OrderEmailAttemptSnapshot = {
  orderId: string;
  provider: string;
  providerIdempotencyKey: string;
  tokenSha256: string;
};

type OrderEmailAttemptSource = {
  order: Order;
  token: CreateDownloadTokenResult;
  orderDeliveryPort: Pick<
    OrderDeliveryPort,
    "provider" | "createProviderIdempotencyKey"
  >;
};

export class OrderEmailAttempt {
  readonly order: Order;
  readonly provider: string;
  readonly providerIdempotencyKey: string;
  private readonly token: CreateDownloadTokenResult;
  private readonly grantToken: OrderGrantToken;

  private constructor(
    source: OrderEmailAttemptSource,
    grantToken: OrderGrantToken,
  ) {
    this.order = source.order;
    this.token = source.token;
    this.provider = source.orderDeliveryPort.provider;
    this.providerIdempotencyKey =
      source.orderDeliveryPort.createProviderIdempotencyKey(
        source.order.emailAttemptKey(source.token.sha256),
      );
    this.grantToken = grantToken;
  }

  static issue(source: OrderEmailAttemptSource): OrderEmailAttempt {
    return new OrderEmailAttempt(source, "stored");
  }

  static reissue(source: OrderEmailAttemptSource): OrderEmailAttempt {
    return new OrderEmailAttempt(source, "replacement");
  }

  toDelivery(recorded: {
    deliveryAttemptId: number;
    at: Date;
  }): OrderEmailDelivery {
    return {
      order: this.order,
      deliveryAttemptId: recorded.deliveryAttemptId,
      provider: this.provider,
      providerIdempotencyKey: this.providerIdempotencyKey,
      rawToken: this.token.rawToken,
      tokenSha256: this.token.sha256,
      grantToken: this.grantToken,
      at: recorded.at,
    };
  }

  toSnapshot(): OrderEmailAttemptSnapshot {
    return {
      orderId: this.order.id,
      provider: this.provider,
      providerIdempotencyKey: this.providerIdempotencyKey,
      tokenSha256: this.token.sha256,
    };
  }
}
