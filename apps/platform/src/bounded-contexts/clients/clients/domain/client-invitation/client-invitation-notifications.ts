export type ClientInvitationMessage = {
  invitationId: string;
  email: string;
  firstName: string;
  rawToken: string;
  sentAt: Date;
  expiresAt: Date;
};

export interface ClientInvitationNotifications {
  sendInvitation(message: ClientInvitationMessage): Promise<"sent" | "failed">;
}
