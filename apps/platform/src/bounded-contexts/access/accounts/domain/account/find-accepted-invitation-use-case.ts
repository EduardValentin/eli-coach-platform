import type { AccountInvitations } from "./account-invitations";

export class FindAcceptedInvitationUseCase {
  constructor(
    private readonly options: {
      invitations: Pick<AccountInvitations, "findAcceptedBy">;
    },
  ) {}

  async execute(authSubjectId: string): Promise<string | null> {
    const invitation =
      await this.options.invitations.findAcceptedBy(authSubjectId);

    return invitation?.id ?? null;
  }
}
