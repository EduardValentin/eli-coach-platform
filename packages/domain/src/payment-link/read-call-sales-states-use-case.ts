import type { CallSalesStates } from "./call-sales-states";

export class ReadCallSalesStatesUseCase {
  constructor(private readonly options: { callSalesStates: CallSalesStates }) {}

  async execute(
    callIds: readonly string[],
  ): ReturnType<CallSalesStates["forCalls"]> {
    return this.options.callSalesStates.forCalls(callIds);
  }
}
