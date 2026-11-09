import type { EmailAcceptancePort } from "../email-acceptance-port";
import type { StoreCurrency } from "../product";
import { StoreRecipientEmail } from "../store-recipient-email";

export type PlaceOrderCommand = {
  email: string;
  idempotencyKey: string;
  productSlugs: readonly string[];
  currency: StoreCurrency;
  marketingConsent: boolean;
};

type OrderRequestProps = Omit<PlaceOrderCommand, "email"> & {
  recipientEmail: StoreRecipientEmail;
};

export class OrderRequest {
  readonly recipientEmail: StoreRecipientEmail;
  readonly idempotencyKey: string;
  readonly productSlugs: readonly string[];
  readonly currency: StoreCurrency;
  readonly marketingConsent: boolean;

  private constructor(props: OrderRequestProps) {
    this.recipientEmail = props.recipientEmail;
    this.idempotencyKey = props.idempotencyKey;
    this.productSlugs = props.productSlugs;
    this.currency = props.currency;
    this.marketingConsent = props.marketingConsent;
  }

  static from(
    command: PlaceOrderCommand,
    emailAcceptancePort: Pick<EmailAcceptancePort, "normalize">,
  ): OrderRequest {
    return new OrderRequest({
      recipientEmail: StoreRecipientEmail.normalized(
        command.email,
        emailAcceptancePort,
      ),
      idempotencyKey: command.idempotencyKey,
      currency: command.currency,
      marketingConsent: command.marketingConsent,
      productSlugs: [...new Set(command.productSlugs)].sort(),
    });
  }

  get email(): string {
    return this.recipientEmail.address;
  }

  canonicalPayload(): string {
    return JSON.stringify({
      currency: this.currency,
      email: this.email,
      marketingConsent: this.marketingConsent,
      productSlugs: this.productSlugs,
    });
  }
}
