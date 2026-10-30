import type {
  EnsureInvitationDeliveredUseCase,
  FindAcceptedInvitationUseCase,
  IssueInvitationUseCase,
  ReadInvitationStandingUseCase,
  ResendInvitationUseCase,
} from "~/bounded-contexts/access/accounts/domain/account";
import type {
  AccountInvitationsFacade,
  InvitationDeliveryDto,
} from "~/bounded-contexts/access/public/account-invitations-facade";

export class AccountInvitationsFacadeAdapter implements AccountInvitationsFacade {
  constructor(
    private readonly useCases: {
      ensureInvitationDelivered: EnsureInvitationDeliveredUseCase;
      findAcceptedInvitation: FindAcceptedInvitationUseCase;
      issueInvitation: IssueInvitationUseCase;
      readInvitationStanding: ReadInvitationStandingUseCase;
      resendInvitation: ResendInvitationUseCase;
    },
  ) {}

  issue({ email }: { email: string }) {
    return this.useCases.issueInvitation.execute({ email });
  }

  ensureDelivered({ invitationId, firstName }: InvitationDeliveryDto) {
    return this.useCases.ensureInvitationDelivered.execute({
      invitationId,
      firstName,
    });
  }

  resend({ invitationId, firstName }: InvitationDeliveryDto) {
    return this.useCases.resendInvitation.execute({ invitationId, firstName });
  }

  async standingOf(invitationId: string) {
    const standing =
      await this.useCases.readInvitationStanding.execute(invitationId);

    return standing
      ? {
          state: standing.state,
          sentAt: standing.sentAt.toISOString(),
          expiresAt: standing.expiresAt.toISOString(),
        }
      : null;
  }

  acceptedInvitationOf(authSubjectId: string) {
    return this.useCases.findAcceptedInvitation.execute(authSubjectId);
  }
}
