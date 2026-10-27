import type { AccountRole } from "./account";
import { AccountInvitation } from "./account-invitation";
import type { AccountInvitations } from "./account-invitations";

type AllowAccountCommand = {
  invitationId: string;
  email: string;
  role: AccountRole;
  expiresAt: Date;
};

export class AllowAccountUseCase {
  constructor(
    private readonly options: {
      invitations: Pick<AccountInvitations, "allow">;
    },
  ) {}

  async execute(command: AllowAccountCommand): Promise<void> {
    await this.options.invitations.allow(
      AccountInvitation.allowed({
        id: command.invitationId,
        email: command.email,
        role: command.role,
        expiresAt: command.expiresAt,
      }),
    );
  }
}
