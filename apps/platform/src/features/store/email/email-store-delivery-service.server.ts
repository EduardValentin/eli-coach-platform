import { joinBasePath } from "@eli-coach-platform/config";
import type {
  StoreDeliveryService,
} from "@eli-coach-platform/domain";
import { StoreDeliveryRejectedError } from "@eli-coach-platform/domain";
import {
  ProductEmailRejectedError,
  type ProductEmailSender,
} from "@eli-coach-platform/infrastructure/email/server";

import { createStoreDeliveryEmailContent } from "./store-delivery-email.server";

type EmailStoreDeliveryServiceOptions = {
  appBasePath: string;
  contactEmail: string;
  publicAppUrl: string;
};

export class EmailStoreDeliveryService
  implements StoreDeliveryService
{
  readonly provider = "resend";

  constructor(
    private readonly productEmailSender: ProductEmailSender,
    private readonly options: EmailStoreDeliveryServiceOptions,
  ) {}

  createProviderIdempotencyKey(applicationIdempotencyKey: string): string {
    return `store-acquisition-${applicationIdempotencyKey}`;
  }

  async deliver(
    command: Parameters<StoreDeliveryService["deliver"]>[0],
  ) {
    const downloadUrl = new URL(
      joinBasePath(this.options.appBasePath, "/store/download"),
      this.options.publicAppUrl,
    );
    downloadUrl.hash = command.rawToken;
    const content = createStoreDeliveryEmailContent({
      contactEmail: this.options.contactEmail,
      currentYear: command.requestedAt.getUTCFullYear(),
      downloadUrl: downloadUrl.toString(),
      resources: command.resources,
    });
    let result: Awaited<ReturnType<ProductEmailSender["sendEmail"]>>;

    try {
      result = await this.productEmailSender.sendEmail({
        html: content.html,
        idempotencyKey: command.idempotencyKey,
        subject: content.subject,
        text: content.text,
        to: command.email,
      });
    } catch (error) {
      if (error instanceof ProductEmailRejectedError) {
        throw new StoreDeliveryRejectedError();
      }

      throw error;
    }

    return {
      provider: this.provider,
      providerMessageId: result.providerMessageId,
    };
  }
}
