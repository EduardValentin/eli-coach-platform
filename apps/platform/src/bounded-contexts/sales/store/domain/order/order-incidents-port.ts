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
  orderEmailRejected(incident: OrderIncident & { reason: string }): void;
  orderEmailAuditPending(incident: OrderIncident): void;
  termsDocumentMissing(
    incident: OrderIncident & { termsVersion: string },
  ): void;
}
