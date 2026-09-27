import type Stripe from "stripe";

import { runRegistry } from "./run-registry";
import { createStripeTestClient } from "./stripe-environment";

type CheckoutCleanup =
  | {
      outcome: "cleaned";
      sessionId: string;
      customerId: string | null;
      subscriptionId: string | null;
    }
  | { outcome: "failed"; sessionId: string; reason: string };

const checkoutSessions = runRegistry("stripe-checkout-sessions-");
const RESOURCE_MISSING = "resource_missing";

export function registerCheckoutSessionForCleanup(
  sessionId: string,
  runId: string,
): void {
  checkoutSessions.record(sessionId, runId);
}

export async function cleanUpRecordedCheckoutSessions(
  runId: string,
  logPrefix: string,
): Promise<{ allCleaned: boolean }> {
  const sessionIds = [...new Set(checkoutSessions.read(runId))];

  if (sessionIds.length === 0) {
    return { allCleaned: true };
  }

  const stripe = createStripeTestClient();
  const results: CheckoutCleanup[] = [];

  for (const sessionId of sessionIds) {
    results.push(await cleanUpCheckoutSession(stripe, sessionId));
  }

  console.log(`${logPrefix} Stripe: ${summarize(results)}`);

  const allCleaned = results.every((result) => result.outcome === "cleaned");

  if (allCleaned) {
    checkoutSessions.remove(runId);
  }

  return { allCleaned };
}

async function cleanUpCheckoutSession(
  stripe: Stripe,
  sessionId: string,
): Promise<CheckoutCleanup> {
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

    return { outcome: "cleaned", sessionId, customerId, subscriptionId };
  } catch (error) {
    return {
      outcome: "failed",
      sessionId,
      reason: error instanceof Error ? error.message : String(error),
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

function summarize(results: CheckoutCleanup[]): string {
  return results
    .map((result) =>
      result.outcome === "cleaned"
        ? `session ${result.sessionId} cleaned (subscription ${result.subscriptionId ?? "none"} cancelled, customer ${result.customerId ?? "none"} deleted)`
        : `session ${result.sessionId} failed: ${result.reason}`,
    )
    .join("; ");
}
