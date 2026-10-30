import type { AccountInvitationsPort } from "./account-invitations-port";

export class FindAcceptedInvitationUseCase {
  constructor(
    private readonly options: {
      invitations: Pick<AccountInvitationsPort, "findAcceptedBy">;
    },
  ) {}

  async execute(authSubjectId: string): Promise<string | null> {
    const invitation =
      await this.options.invitations.findAcceptedBy(authSubjectId);

    return invitation?.id ?? null;
  }
}
