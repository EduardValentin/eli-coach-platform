import type { StoreDeliveryResult, StoreDeliveryService } from "@eli-coach-platform/domain/store";

export class DisabledStoreDeliveryService
  implements StoreDeliveryService
{
  readonly provider = "disabled";

  createProviderIdempotencyKey(applicationIdempotencyKey: string): string {
    return `disabled-store-acquisition-${applicationIdempotencyKey}`;
  }

  async deliver(
    _command: Parameters<StoreDeliveryService["deliver"]>[0],
  ): Promise<StoreDeliveryResult> {
    return { kind: "rejected", reason: "product_email_disabled" };
  }
}
