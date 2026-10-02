import type Stripe from "stripe";

import { runRegistry } from "./run-registry";
import { createStripeTestClient } from "./stripe-environment";

type StripeCleanup =
  | { outcome: "cleaned"; summary: string }
  | { outcome: "failed"; summary: string };

const checkoutSessions = runRegistry("stripe-checkout-sessions-");
const customers = runRegistry("stripe-customers-");
const RESOURCE_MISSING = "resource_missing";

export function registerCheckoutSessionForCleanup(
  sessionId: string,
  runId: string,
): void {
  checkoutSessions.record(sessionId, runId);
}

export function registerCustomerForCleanup(
  customerId: string,
  runId: string,
): void {
  customers.record(customerId, runId);
}

export async function cleanUpRecordedStripeObjects(
  runId: string,
  logPrefix: string,
): Promise<{ allCleaned: boolean }> {
  const sessionIds = [...new Set(checkoutSessions.read(runId))];
  const customerIds = [...new Set(customers.read(runId))];

  if (sessionIds.length === 0 && customerIds.length === 0) {
    return { allCleaned: true };
  }

  const stripe = createStripeTestClient();
  const sessionResults: StripeCleanup[] = [];
  const customerResults: StripeCleanup[] = [];

  for (const sessionId of sessionIds) {
    sessionResults.push(await cleanUpCheckoutSession(stripe, sessionId));
  }

  for (const customerId of customerIds) {
    customerResults.push(await cleanUpCustomer(stripe, customerId));
  }

  console.log(
    `${logPrefix} Stripe: ${summarize([...sessionResults, ...customerResults])}`,
  );

  if (allCleaned(sessionResults)) {
    checkoutSessions.remove(runId);
  }

  if (allCleaned(customerResults)) {
    customers.remove(runId);
  }

  return { allCleaned: allCleaned([...sessionResults, ...customerResults]) };
}

async function cleanUpCheckoutSession(
  stripe: Stripe,
  sessionId: string,
): Promise<StripeCleanup> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const customerId = referencedId(session.customer);
    const subscriptionId = referencedId(session.subscription);

    if (subscriptionId) {
      await ignoringMissing(() => stripe.subscriptions.cancel(subscriptionId));
    }

    if (customerId) {
      await ignoringMissing(() => stripe.customers.del(customerId));
    }

    return {
      outcome: "cleaned",
      summary: `session ${sessionId} cleaned (subscription ${subscriptionId ?? "none"} cancelled, customer ${customerId ?? "none"} deleted)`,
    };
  } catch (error) {
    return {
      outcome: "failed",
      summary: `session ${sessionId} failed: ${reasonOf(error)}`,
    };
  }
}

async function cleanUpCustomer(
  stripe: Stripe,
  customerId: string,
): Promise<StripeCleanup> {
  try {
    await ignoringMissing(() => stripe.customers.del(customerId));

    return {
      outcome: "cleaned",
      summary: `customer ${customerId} deleted with its subscriptions`,
    };
  } catch (error) {
    return {
      outcome: "failed",
      summary: `customer ${customerId} failed: ${reasonOf(error)}`,
    };
  }
}

function referencedId(
  reference: string | { id: string } | null,
): string | null {
  if (reference === null) {
    return null;
  }

  return typeof reference === "string" ? reference : reference.id;
}

async function ignoringMissing(request: () => Promise<unknown>): Promise<void> {
  try {
    await request();
  } catch (error) {
    if ((error as { code?: string }).code !== RESOURCE_MISSING) {
      throw error;
    }
  }
}

function allCleaned(results: StripeCleanup[]): boolean {
  return results.every((result) => result.outcome === "cleaned");
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function summarize(results: StripeCleanup[]): string {
  return results.map((result) => result.summary).join("; ");
}
