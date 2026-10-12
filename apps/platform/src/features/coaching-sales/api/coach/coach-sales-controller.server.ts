import type { ReadPricingTiersUseCase } from "@eli-coach-platform/domain/coaching-bundle";
import type {
  ReadSubscriptionSummaryUseCase,
  RefundDueSnapshot,
} from "@eli-coach-platform/domain/coaching-subscription";
import { EmailAddress } from "@eli-coach-platform/domain/email-address";
import type { ReadCallSalesStatesUseCase } from "@eli-coach-platform/domain/payment-link";
import type { LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  clientSubscriptionSchema,
  type ClientSubscription,
} from "~/features/coaching-sales/public/client-subscription";
import {
  pricingTiersSchema,
  callSalesSchema,
  type PricingTiers,
  type CallSales,
} from "~/features/coaching-sales/public/coaching-sales";

type CoachSalesControllerOptions = {
  readCallSalesStates: ReadCallSalesStatesUseCase;
  readPricingTiers: ReadPricingTiersUseCase;
  readSubscriptionSummary: ReadSubscriptionSummaryUseCase;
};

type SubscriptionSummary = NonNullable<
  Awaited<ReturnType<ReadSubscriptionSummaryUseCase["execute"]>>
>;

const CLIENT_ID_SCHEMA = z.uuid();

type CallVisitorEmail = { email: string; id: string };

export class CoachSalesController {
  constructor(private readonly options: CoachSalesControllerOptions) {}

  async loadCallSales(callIds: readonly string[]): Promise<CallSales> {
    const sales = await this.options.readCallSalesStates.execute(callIds);

    return callSalesSchema.parse(Object.fromEntries(sales));
  }

  async loadClientSubscription(
    args: LoaderFunctionArgs,
    clientId: string,
  ): Promise<ClientSubscription | null> {
    requirePortalAccess(args, { role: "COACH" });

    const id = CLIENT_ID_SCHEMA.safeParse(clientId);

    if (!id.success) {
      return null;
    }

    const summary = await this.options.readSubscriptionSummary.execute(id.data);

    return summary
      ? clientSubscriptionSchema.parse(subscriptionOf(summary))
      : null;
  }

  async loadPricingTiers(
    calls: readonly CallVisitorEmail[],
  ): Promise<PricingTiers> {
    const normalizedCalls = calls.map((call) => ({
      email: EmailAddress.normalize(call.email),
      id: call.id,
    }));
    const tiers = await this.options.readPricingTiers.execute(
      normalizedCalls.map((call) => call.email),
    );

    return pricingTiersSchema.parse(
      Object.fromEntries(
        normalizedCalls.map((call) => [call.id, tiers.get(call.email.value)]),
      ),
    );
  }
}

function subscriptionOf(summary: SubscriptionSummary) {
  const { subscription, status: subscriptionStatus } = summary;
  const accessEndsOn = subscription.accessEndsAt?.toISOString() ?? null;

  return {
    bundleId: subscription.bundleId,
    months: subscription.months,
    reducedPrice: subscription.tier === "reduced",
    paidAt: subscription.paidAt.toISOString(),
    workStartsOn: summary.workStartsOn?.toISOString() ?? null,
    status: subscriptionStatus,
    endsOn: subscriptionStatus === "cancelled" ? accessEndsOn : null,
    endedOn: subscriptionStatus === "ended" ? accessEndsOn : null,
    refund: subscription.refund
      ? refundOf(subscription.refund, {
          currency: subscription.currency,
          outstandingCents: summary.refundOutstandingCents ?? 0,
        })
      : null,
  };
}

function refundOf(
  refund: RefundDueSnapshot,
  reading: { currency: string; outstandingCents: number },
) {
  return {
    reason: refund.reason,
    amountCents: refund.amountCents,
    outstandingCents: reading.outstandingCents,
    refundedCents: refund.refundedCents,
    currency: reading.currency,
    dueBy: refund.dueBy?.toISOString() ?? null,
    refundedOn: refund.refundedAt?.toISOString() ?? null,
  };
}
