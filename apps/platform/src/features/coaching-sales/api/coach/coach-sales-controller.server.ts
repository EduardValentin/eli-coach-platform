import type { ReadCallSalesStatesUseCase } from "@eli-coach-platform/domain/payment-link";

import {
  salesStatesSchema,
  type SalesStates,
} from "~/features/coaching-sales/contracts/coaching-sales";

type CoachSalesControllerOptions = {
  readCallSalesStates: ReadCallSalesStatesUseCase;
};

export class CoachSalesController {
  constructor(private readonly options: CoachSalesControllerOptions) {}

  async loadSalesStates(callIds: readonly string[]): Promise<SalesStates> {
    const states = await this.options.readCallSalesStates.execute(callIds);

    return salesStatesSchema.parse(Object.fromEntries(states));
  }
}
