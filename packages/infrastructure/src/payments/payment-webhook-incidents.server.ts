export interface PaymentWebhookIncidents {
  paymentEventUnrouted(incident: {
    eventId: string;
    purpose: string | null;
  }): void;
}
