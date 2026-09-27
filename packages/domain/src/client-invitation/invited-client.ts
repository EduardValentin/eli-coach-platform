export type InvitedClient = {
  id: string;
  email: string;
  firstName: string;
  authSubjectId: string | null;
};

export interface InvitedClients {
  findById(clientId: string): Promise<InvitedClient | null>;
}
