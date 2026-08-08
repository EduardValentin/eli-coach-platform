import type {
  StoreDeliveryService,
} from "@eli-coach-platform/domain";
import { StoreDeliveryRejectedError } from "@eli-coach-platform/domain";

export class DisabledStoreDeliveryService
  implements StoreDeliveryService
{
  readonly provider = "disabled";

  createProviderIdempotencyKey(applicationIdempotencyKey: string): string {
    return `disabled-store-acquisition-${applicationIdempotencyKey}`;
  }

  async deliver(
    _command: Parameters<StoreDeliveryService["deliver"]>[0],
  ): Promise<never> {
    throw new StoreDeliveryRejectedError();
  }
}
