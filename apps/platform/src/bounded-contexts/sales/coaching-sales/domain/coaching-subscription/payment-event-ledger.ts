export type PaymentEventEntry = {
  eventId: string;
  receivedAt: Date;
};

export interface PaymentEventLedger {
  record(entry: PaymentEventEntry): Promise<"recorded" | "duplicate">;
}
