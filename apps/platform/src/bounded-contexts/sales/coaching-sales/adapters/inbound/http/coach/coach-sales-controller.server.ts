import type { ReadPricingTiersUseCase } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-bundle";
import type {
  ReadSubscriptionSummaryUseCase,
  RefundDueSnapshot,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { ReadCallSalesStatesUseCase } from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";
import type { EmailAcceptancePort } from "~/bounded-contexts/sales/coaching-sales/domain/email-acceptance-port";
import type { LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import {
  clientSubscriptionSchema,
  type ClientSubscription,
} from "~/bounded-contexts/sales/coaching-sales/public/client-subscription";
import {
  pricingTiersSchema,
  callSalesSchema,
  type PricingTiers,
  type CallSales,
} from "~/bounded-contexts/sales/coaching-sales/public/coaching-sales";
import { accessContext } from "~/bounded-contexts/access/public/session";

type CoachSalesControllerOptions = {
  emailAcceptancePort: EmailAcceptancePort;
  readCallSalesStatesUseCase: ReadCallSalesStatesUseCase;
  readPricingTiersUseCase: ReadPricingTiersUseCase;
  readSubscriptionSummaryUseCase: ReadSubscriptionSummaryUseCase;
};

type SubscriptionSummary = NonNullable<
  Awaited<ReturnType<ReadSubscriptionSummaryUseCase["execute"]>>
>;

const clientIdSchema = z.uuid();

type CallVisitorEmail = { email: string; id: string };

export class CoachSalesController {
  constructor(private readonly options: CoachSalesControllerOptions) {}

  async loadCallSales(callIds: readonly string[]): Promise<CallSales> {
    const sales =
      await this.options.readCallSalesStatesUseCase.execute(callIds);

    return callSalesSchema.parse(Object.fromEntries(sales));
  }

  async loadClientSubscription(
    args: LoaderFunctionArgs,
    clientId: string,
  ): Promise<ClientSubscription | null> {
    args.context.get(accessContext).requirePortalAccess("COACH");

    const id = clientIdSchema.safeParse(clientId);

    if (!id.success) {
      return null;
    }

    const summary = await this.options.readSubscriptionSummaryUseCase.execute(
      id.data,
    );

    return summary
      ? clientSubscriptionSchema.parse(this.subscriptionOf(summary))
      : null;
  }

  async loadPricingTiers(
    calls: readonly CallVisitorEmail[],
  ): Promise<PricingTiers> {
    const normalizedCalls = calls.map((call) => ({
      email: this.options.emailAcceptancePort.normalize(call.email),
      id: call.id,
    }));
    const tiers = await this.options.readPricingTiersUseCase.execute(
      normalizedCalls.map((call) => call.email),
    );

    return pricingTiersSchema.parse(
      Object.fromEntries(
        normalizedCalls.map((call) => [call.id, tiers.get(call.email)]),
      ),
    );
  }

  private subscriptionOf(summary: SubscriptionSummary) {
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
        ? this.refundOf(subscription.refund, {
            currency: subscription.currency,
            outstandingCents: summary.refundOutstandingCents ?? 0,
          })
        : null,
    };
  }

  private refundOf(
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
}
