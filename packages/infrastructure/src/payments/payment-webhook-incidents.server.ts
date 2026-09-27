export interface PaymentWebhookIncidents {
  paymentEventHandlingFailed(incident: {
    errorClass: string;
    eventId: string;
    purpose: string;
  }): void;
  paymentEventUnrouted(incident: {
    eventId: string;
    purpose: string | null;
  }): void;
}
