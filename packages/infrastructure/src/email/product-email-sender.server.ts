export type SendProductEmailCommand = {
  html: string;
  idempotencyKey?: string;
  subject: string;
  text: string;
  to: string;
};

export type SendProductEmailResult = {
  providerMessageId: string;
};

export class ProductEmailRejectedError extends Error {
  constructor() {
    super("Product email provider rejected the request.");
    this.name = "ProductEmailRejectedError";
  }
}

export class ProductEmailDeliveryUnconfirmedError extends Error {
  constructor() {
    super("Product email delivery could not be confirmed.");
    this.name = "ProductEmailDeliveryUnconfirmedError";
  }
}

export interface ProductEmailSender {
  sendEmail(command: SendProductEmailCommand): Promise<SendProductEmailResult>;
}
