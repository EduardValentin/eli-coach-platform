import type {
  StoreDeliveryEmailSender,
} from "@eli-coach-platform/domain";
import { StoreDeliveryRejectedError } from "@eli-coach-platform/domain";

export class DisabledStoreDeliveryEmailSender
  implements StoreDeliveryEmailSender
{
  readonly provider = "disabled";

  createProviderIdempotencyKey(applicationIdempotencyKey: string): string {
    return `disabled-store-acquisition-${applicationIdempotencyKey}`;
  }

  async sendDelivery(
    _command: Parameters<StoreDeliveryEmailSender["sendDelivery"]>[0],
  ): Promise<never> {
    throw new StoreDeliveryRejectedError();
  }
}
