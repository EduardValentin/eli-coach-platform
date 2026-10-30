export type InvitedClient = {
  id: string;
  email: string;
  firstName: string;
  authSubjectId: string | null;
  accountInvitationId: string | null;
  coachingCancelledOrEnded: boolean;
};

export interface InvitedClientsPort {
  findById(clientId: string): Promise<InvitedClient | null>;
  findByAccountInvitationId(
    invitationId: string,
  ): Promise<InvitedClient | null>;
  recordAccountInvitation(reference: {
    clientId: string;
    invitationId: string;
  }): Promise<void>;
  bindAuthSubject(binding: {
    clientId: string;
    authSubjectId: string;
  }): Promise<"bound" | "raced">;
}
