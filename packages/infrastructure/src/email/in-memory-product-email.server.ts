import type {
  ProductEmail,
  ProductEmailCommand,
  ProductEmailResult,
} from "./product-email-contract.server";

export class InMemoryProductEmail implements ProductEmail {
  readonly provider = "memory";
  private readonly deliveries: ProductEmailCommand[] = [];

  get sent(): readonly ProductEmailCommand[] {
    return this.deliveries;
  }

  async send(command: ProductEmailCommand): Promise<ProductEmailResult> {
    this.deliveries.push(command);

    return { kind: "sent", providerMessageId: `memory-${this.sent.length}` };
  }
}
