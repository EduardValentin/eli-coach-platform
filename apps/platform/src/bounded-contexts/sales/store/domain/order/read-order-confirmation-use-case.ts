import type { OrderConfirmation } from "./order";
import type { StoreCheckoutPort } from "./store-checkout-port";
import type { StoreOrdersPort } from "./store-orders-port";

export type ReadOrderConfirmationResult =
  | { status: "confirmed"; confirmation: OrderConfirmation }
  | { status: "not_completed" };

type ReadOrderConfirmationUseCaseOptions = {
  storeOrdersPort: Pick<StoreOrdersPort, "findByCheckoutSession">;
  storeCheckoutPort: Pick<StoreCheckoutPort, "isPaid">;
};

export class ReadOrderConfirmationUseCase {
  constructor(private readonly options: ReadOrderConfirmationUseCaseOptions) {}

  async execute(sessionId: string): Promise<ReadOrderConfirmationResult> {
    const order =
      await this.options.storeOrdersPort.findByCheckoutSession(sessionId);

    if (!order || order.status === "refunded") {
      return { status: "not_completed" };
    }

    if (
      order.isConfirmable() ||
      (await this.options.storeCheckoutPort.isPaid(sessionId))
    ) {
      return { status: "confirmed", confirmation: order.confirmation() };
    }

    return { status: "not_completed" };
  }
}
