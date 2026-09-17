import { joinBasePath } from "@eli-coach-platform/config";
import type { ProductEmail } from "@eli-coach-platform/domain/shared";
import type {
  StoreDeliveryResult,
  StoreDeliveryService,
} from "@eli-coach-platform/domain/store";

import { STORE_DOWNLOAD_PATH } from "~/features/store/contracts/paths";

import { createStoreDeliveryEmailContent } from "./store-delivery-email.server";

type EmailStoreDeliveryServiceOptions = {
  appBasePath: string;
  contactEmail: string;
  publicAppUrl: string;
};

export class EmailStoreDeliveryService implements StoreDeliveryService {
  readonly provider: string;

  constructor(
    private readonly productEmail: ProductEmail,
    private readonly options: EmailStoreDeliveryServiceOptions,
  ) {
    this.provider = productEmail.provider;
  }

  createProviderIdempotencyKey(applicationIdempotencyKey: string): string {
    return `store-acquisition-${applicationIdempotencyKey}`;
  }

  async deliver(
    command: Parameters<StoreDeliveryService["deliver"]>[0],
  ): Promise<StoreDeliveryResult> {
    const downloadUrl = new URL(
      joinBasePath(this.options.appBasePath, STORE_DOWNLOAD_PATH),
      this.options.publicAppUrl,
    );
    downloadUrl.hash = command.rawToken;
    const content = createStoreDeliveryEmailContent({
      contactEmail: this.options.contactEmail,
      currentYear: command.requestedAt.getUTCFullYear(),
      downloadUrl: downloadUrl.toString(),
      resources: command.resources,
    });
    const delivery = await this.productEmail.send({
      html: content.html,
      idempotencyKey: command.idempotencyKey,
      subject: content.subject,
      text: content.text,
      to: command.email,
    });

    if (delivery.kind === "sent") {
      return {
        kind: "delivered",
        provider: this.provider,
        providerMessageId: delivery.providerMessageId,
      };
    }

    if (delivery.kind === "rejected") {
      return { kind: "rejected", reason: delivery.reason };
    }

    return { kind: "unconfirmed" };
  }
}
