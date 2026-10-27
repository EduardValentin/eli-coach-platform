type AcquisitionIncident = {
  requestId: number;
};

export interface AcquisitionIncidents {
  deliveryAcceptanceAuditPending(incident: AcquisitionIncident): void;
  deliveryRejected(incident: AcquisitionIncident & { reason: string }): void;
  retryableDeliveryAuditPending(incident: AcquisitionIncident): void;
}
