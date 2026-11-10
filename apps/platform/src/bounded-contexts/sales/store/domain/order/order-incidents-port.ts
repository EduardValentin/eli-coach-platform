type OrderIncident = {
  orderId: string;
};

export interface OrderIncidentsPort {
  paymentAmountMismatch(
    incident: OrderIncident & {
      expectedMinorUnits: number;
      expectedCurrency: string;
      chargedMinorUnits: number;
      chargedCurrency: string;
    },
  ): void;
  paidOrderUnknown(incident: OrderIncident & { eventId: string }): void;
  paidSessionMismatch(incident: OrderIncident & { eventId: string }): void;
  orderEmailRejected(incident: OrderIncident & { reason: string }): void;
  orderEmailAuditPending(incident: OrderIncident): void;
  orderLinkRotationPending(incident: OrderIncident): void;
  orderRefunded(
    incident: OrderIncident & { refundedMinorUnits: number; currency: string },
  ): void;
  termsDocumentMissing(
    incident: OrderIncident & { termsVersion: string },
  ): void;
}
