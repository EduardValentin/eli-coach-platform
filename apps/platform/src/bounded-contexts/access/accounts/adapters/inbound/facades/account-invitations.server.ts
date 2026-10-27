import type {
  AllowAccountUseCase,
  FindAcceptedInvitationUseCase,
} from "~/bounded-contexts/access/accounts/domain/account";
import type { AccountInvitationsFacade } from "~/bounded-contexts/access/public/account-invitations";

export function createAccountInvitationsFacade(useCases: {
  allowAccount: AllowAccountUseCase;
  findAcceptedInvitation: FindAcceptedInvitationUseCase;
}): AccountInvitationsFacade {
  return {
    allowAccount: ({ invitationId, email, role, expiresAt }) =>
      useCases.allowAccount.execute({
        invitationId,
        email,
        role,
        expiresAt: new Date(expiresAt),
      }),
    acceptedInvitationOf: (authSubjectId) =>
      useCases.findAcceptedInvitation.execute(authSubjectId),
  };
}
