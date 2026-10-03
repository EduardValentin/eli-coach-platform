export type InvitedClient = {
  id: string;
  email: string;
  firstName: string;
  authSubjectId: string | null;
  coachingClosed: boolean;
};

export interface InvitedClients {
  findById(clientId: string): Promise<InvitedClient | null>;
}
