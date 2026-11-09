export interface PaymentWebhookIncidentsPort {
  paymentEventHandlingFailed(incident: {
    error: unknown;
    eventId: string;
    handler: string;
  }): void;
  paymentEventUnrouted(incident: {
    eventId: string;
    purpose: string | null;
  }): void;
}
