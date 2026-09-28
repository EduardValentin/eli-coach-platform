export interface InvitationAcceptance {
  accept(input: { authSubjectId: string }): Promise<"accepted" | "refused">;
}
