export type AccountInvitationMessage = {
  invitationId: string;
  email: string;
  firstName: string;
  rawToken: string;
  sentAt: Date;
  expiresAt: Date;
};

export interface AccountInvitationNotificationsPort {
  sendInvitation(message: AccountInvitationMessage): Promise<"sent" | "failed">;
}
