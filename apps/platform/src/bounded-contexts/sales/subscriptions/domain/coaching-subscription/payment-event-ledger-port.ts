export type PaymentEventEntry = {
  eventId: string;
  receivedAt: Date;
};

export interface PaymentEventLedgerPort {
  record(entry: PaymentEventEntry): Promise<"recorded" | "duplicate">;
}
