import type { EmailAcceptancePort } from "../email-acceptance-port";
import type { StoreCurrency } from "../product";

export type PlaceOrderCommand = {
  email: string;
  idempotencyKey: string;
  productSlugs: readonly string[];
  currency: StoreCurrency;
  marketingConsent: boolean;
};

export class OrderRequest {
  readonly email: string;
  readonly idempotencyKey: string;
  readonly productSlugs: readonly string[];
  readonly currency: StoreCurrency;
  readonly marketingConsent: boolean;

  private constructor(command: PlaceOrderCommand) {
    this.email = command.email;
    this.idempotencyKey = command.idempotencyKey;
    this.productSlugs = command.productSlugs;
    this.currency = command.currency;
    this.marketingConsent = command.marketingConsent;
  }

  static from(
    command: PlaceOrderCommand,
    emailAcceptancePort: Pick<EmailAcceptancePort, "normalize">,
  ): OrderRequest {
    return new OrderRequest({
      ...command,
      email: emailAcceptancePort.normalize(command.email),
      productSlugs: [...new Set(command.productSlugs)].sort(),
    });
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
