import { randomUUID } from "node:crypto";

import type {
  CheckoutCompletion,
  CreateCheckoutSessionCommand,
  PaymentCheckout,
} from "@eli-coach-platform/domain/coaching-subscription";

const CHECKOUT_SESSION_ID_PLACEHOLDER = "{CHECKOUT_SESSION_ID}";

type RememberedSession = {
  command: CreateCheckoutSessionCommand;
  createdAt: Date;
};

export class InMemoryPaymentCheckout implements PaymentCheckout {
  private readonly customerEmails = new Map<string, string>();
  private readonly sessions = new Map<string, RememberedSession>();

  async createCustomer(command: {
    email: string;
    assessmentCallId: string;
  }): Promise<{ id: string }> {
    const id = `cus_memory_${command.assessmentCallId}`;
    this.customerEmails.set(id, command.email);

    return { id };
  }

  async createSession(
    command: CreateCheckoutSessionCommand,
  ): Promise<{ id: string; url: string }> {
    const id = `cs_memory_${randomUUID()}`;
    this.sessions.set(id, { command, createdAt: new Date() });

    return {
      id,
      url: command.successUrl.replace(CHECKOUT_SESSION_ID_PLACEHOLDER, id),
    };
  }

  async expireSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async findCompletedSession(id: string): Promise<CheckoutCompletion | null> {
    const session = this.sessions.get(id);

    if (!session) {
      return null;
    }

    const { command, createdAt } = session;
    const customerEmail = this.customerEmails.get(command.customerId);

    if (!customerEmail) {
      return null;
    }

    return {
      checkoutSessionId: id,
      paymentCustomerId: command.customerId,
      paymentSubscriptionId: `sub_memory_${id}`,
      amountCents: command.bundle.amountCents,
      currency: command.currency,
      customerEmail,
      paidAt: createdAt,
      assessmentCallId: command.metadata.assessmentCallId,
      bundleId: command.metadata.bundleId,
      tier: command.metadata.tier,
      startChoice: command.metadata.startChoice,
    };
  }
}
