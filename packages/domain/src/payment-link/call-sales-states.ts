export type CallSalesState = "held" | "payment-link-sent" | "paid";

export interface CallSalesStates {
  forCalls(
    callIds: readonly string[],
  ): Promise<
    ReadonlyMap<string, { state: CallSalesState; clientId: string | null }>
  >;
}
