import type { CallSale, CallSalesStates } from "./call-sales-states";

export class ReadCallSalesStatesUseCase {
  constructor(private readonly options: { callSalesStates: CallSalesStates }) {}

  async execute(
    callIds: readonly string[],
  ): Promise<ReadonlyMap<string, CallSale>> {
    return this.options.callSalesStates.forCalls(callIds);
  }
}
