import { randomUUID } from "node:crypto";

import type {
  OpenCheckoutCommand,
  OpenedCheckout,
  StoreCheckoutPort,
} from "~/bounded-contexts/sales/store/domain/order";

const CHECKOUT_SESSION_ID_PLACEHOLDER = "{CHECKOUT_SESSION_ID}";

export class InMemoryStoreCheckoutAdapter implements StoreCheckoutPort {
  private readonly sessionIds = new Set<string>();

  async open(command: OpenCheckoutCommand): Promise<OpenedCheckout> {
    const sessionId = `cs_memory_${randomUUID()}`;
    this.sessionIds.add(sessionId);

    return {
      sessionId,
      url: command.successUrl.replace(
        CHECKOUT_SESSION_ID_PLACEHOLDER,
        sessionId,
      ),
    };
  }

  async isPaid(sessionId: string): Promise<boolean> {
    return this.sessionIds.has(sessionId);
  }
}
