export interface ClientInvitationIncidents {
  invitationEmailFailed(incident: { invitationId: string }): void;
}
