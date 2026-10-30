export type CallSalesState = "held" | "payment-link-sent" | "paid";

export type CallSale = { state: CallSalesState; clientId: string | null };

export interface CallSalesStatesPort {
  forCalls(callIds: readonly string[]): Promise<ReadonlyMap<string, CallSale>>;
}
