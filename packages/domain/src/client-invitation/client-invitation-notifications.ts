export type ClientInvitationMessage = {
  invitationId: string;
  email: string;
  firstName: string;
  rawToken: string;
  expiresAt: Date;
};

export interface ClientInvitationNotifications {
  sendInvitation(message: ClientInvitationMessage): Promise<"sent" | "failed">;
}
