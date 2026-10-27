export interface InvitationReferences {
  invitationIdOf(authSubjectId: string): Promise<string | null>;
}
