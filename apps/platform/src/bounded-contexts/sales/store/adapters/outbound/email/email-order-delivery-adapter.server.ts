import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type {
  OrderDeliveryPort,
  OrderDeliveryResult,
  OrderEmail,
} from "~/bounded-contexts/sales/store/domain/order";
import { STORE_DOWNLOAD_PATH } from "~/bounded-contexts/sales/store/public/paths";
import { formatStoreAmount } from "~/bounded-contexts/sales/store/public/store-currency";
import type { ProductEmailPort } from "~/shared/email/index.server";
import { joinBasePath } from "~/shared/http/base-path";

import {
  STORE_ORDER_EMAIL_COPY,
  StoreOrderEmailTemplate,
  type StoreOrderEmailViewModel,
} from "./store-order-email-template.server";

type EmailOrderDeliveryOptions = {
  appBasePath: string;
  contactEmail: string;
  publicAppUrl: string;
};

export class EmailOrderDeliveryAdapter implements OrderDeliveryPort {
  readonly provider: string;

  constructor(
    private readonly productEmailPort: ProductEmailPort,
    private readonly options: EmailOrderDeliveryOptions,
  ) {
    this.provider = productEmailPort.provider;
  }

  createProviderIdempotencyKey(applicationIdempotencyKey: string): string {
    return `store-order-${applicationIdempotencyKey}`;
  }

  async deliver(orderEmail: OrderEmail): Promise<OrderDeliveryResult> {
    const viewModel = this.viewModel(orderEmail);
    const delivery = await this.productEmailPort.send({
      attachments: [orderEmail.terms.document],
      html: `<!doctype html>${renderToStaticMarkup(
        createElement(StoreOrderEmailTemplate, viewModel),
      )}`,
      idempotencyKey: orderEmail.idempotencyKey,
      subject: STORE_ORDER_EMAIL_COPY.subject,
      text: this.plainText(viewModel),
      to: orderEmail.email,
    });

    if (delivery.kind === "sent") {
      return {
        kind: "delivered",
        provider: this.provider,
        providerMessageId: delivery.providerMessageId,
      };
    }

    return delivery;
  }

  private viewModel(orderEmail: OrderEmail): StoreOrderEmailViewModel {
    const downloadUrl = new URL(this.publicUrl(STORE_DOWNLOAD_PATH));
    downloadUrl.hash = orderEmail.rawToken;

    return {
      contactEmail: this.options.contactEmail,
      currentYear: orderEmail.sentAt.getUTCFullYear(),
      currency: orderEmail.currency,
      deliveryConfirmation: `${orderEmail.terms.deliveryConfirmationNotice} ${STORE_ORDER_EMAIL_COPY.termsAttachedNote(orderEmail.terms.version)}`,
      downloadUrl: downloadUrl.toString(),
      lines: orderEmail.lines.map((line) => ({
        title: line.title,
        amount:
          line.amountMinorUnits === null
            ? null
            : formatStoreAmount(line.amountMinorUnits, orderEmail.currency),
      })),
      total: formatStoreAmount(orderEmail.totalMinorUnits, orderEmail.currency),
    };
  }

  private plainText(viewModel: StoreOrderEmailViewModel): string {
    const copy = STORE_ORDER_EMAIL_COPY;

    return [
      copy.heading,
      copy.subhead,
      "",
      ...copy.bodyParagraphs,
      "",
      `${copy.buttonLabel}: ${viewModel.downloadUrl}`,
      "",
      `${copy.orderEyebrow}:`,
      ...viewModel.lines.map(
        (line) => `- ${line.title} — ${line.amount ?? copy.freeLabel}`,
      ),
      `TOTAL (${viewModel.currency}): ${viewModel.total}`,
      "",
      copy.receiptNote,
      viewModel.deliveryConfirmation,
      `Questions? Reply to this email or write to ${viewModel.contactEmail}.`,
      "",
      copy.footer,
      `© ${viewModel.currentYear} Evoa Fitness`,
    ].join("\n");
  }

  private publicUrl(path: string): string {
    return new URL(
      joinBasePath(this.options.appBasePath, path),
      this.options.publicAppUrl,
    ).toString();
  }
}
