export interface ClientInvitationIncidents {
  invitationEmailFailed(incident: { invitationId: string }): void;
  invitationResent(incident: { invitationId: string }): void;
  invitationResendFailed(incident: {
    invitationId: string;
    step: "provider" | "email";
  }): void;
}
