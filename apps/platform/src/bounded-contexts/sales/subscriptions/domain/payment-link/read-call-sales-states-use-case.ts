import type { CallSale, CallSalesStatesPort } from "./call-sales-states-port";

export class ReadCallSalesStatesUseCase {
  constructor(
    private readonly options: { callSalesStatesPort: CallSalesStatesPort },
  ) {}

  async execute(
    callIds: readonly string[],
  ): Promise<ReadonlyMap<string, CallSale>> {
    return this.options.callSalesStatesPort.forCalls(callIds);
  }
}
