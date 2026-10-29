import type {
  EnsureInvitationDeliveredUseCase,
  FindAcceptedInvitationUseCase,
  IssueInvitationUseCase,
  ReadInvitationStandingUseCase,
  ResendInvitationUseCase,
} from "~/bounded-contexts/access/accounts/domain/account";
import type { AccountInvitationsFacade } from "~/bounded-contexts/access/public/account-invitations";

export function createAccountInvitationsFacade(useCases: {
  ensureInvitationDelivered: EnsureInvitationDeliveredUseCase;
  findAcceptedInvitation: FindAcceptedInvitationUseCase;
  issueInvitation: IssueInvitationUseCase;
  readInvitationStanding: ReadInvitationStandingUseCase;
  resendInvitation: ResendInvitationUseCase;
}): AccountInvitationsFacade {
  return {
    issue: ({ email }) => useCases.issueInvitation.execute({ email }),
    ensureDelivered: ({ invitationId, firstName }) =>
      useCases.ensureInvitationDelivered.execute({ invitationId, firstName }),
    resend: ({ invitationId, firstName }) =>
      useCases.resendInvitation.execute({ invitationId, firstName }),
    standingOf: async (invitationId) => {
      const standing =
        await useCases.readInvitationStanding.execute(invitationId);

      return standing
        ? {
            state: standing.state,
            sentAt: standing.sentAt.toISOString(),
            expiresAt: standing.expiresAt.toISOString(),
          }
        : null;
    },
    acceptedInvitationOf: (authSubjectId) =>
      useCases.findAcceptedInvitation.execute(authSubjectId),
  };
}
