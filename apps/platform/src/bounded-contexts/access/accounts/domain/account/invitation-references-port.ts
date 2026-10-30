export interface InvitationReferencesPort {
  invitationIdOf(authSubjectId: string): Promise<string | null>;
}
