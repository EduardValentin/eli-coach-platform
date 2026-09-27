import type { ReadPricingTiersUseCase } from "@eli-coach-platform/domain/coaching-bundle";
import { EmailAddress } from "@eli-coach-platform/domain/email-address";
import type { ReadCallSalesStatesUseCase } from "@eli-coach-platform/domain/payment-link";

import {
  pricingTiersSchema,
  salesStatesSchema,
  type PricingTiers,
  type SalesStates,
} from "~/features/coaching-sales/contracts/coaching-sales";

type CoachSalesControllerOptions = {
  readCallSalesStates: ReadCallSalesStatesUseCase;
  readPricingTiers: ReadPricingTiersUseCase;
};

type CallVisitorEmail = { email: string; id: string };

export class CoachSalesController {
  constructor(private readonly options: CoachSalesControllerOptions) {}

  async loadSalesStates(callIds: readonly string[]): Promise<SalesStates> {
    const states = await this.options.readCallSalesStates.execute(callIds);

    return salesStatesSchema.parse(Object.fromEntries(states));
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
