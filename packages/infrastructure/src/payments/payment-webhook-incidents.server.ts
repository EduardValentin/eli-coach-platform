export interface PaymentWebhookIncidents {
  paymentEventHandlingFailed(incident: {
    errorClass: string;
    eventId: string;
    handler: string;
  }): void;
  paymentEventUnrouted(incident: {
    eventId: string;
    purpose: string | null;
  }): void;
}
