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
      ensureInvitationDeliveredUseCase: EnsureInvitationDeliveredUseCase;
      findAcceptedInvitationUseCase: FindAcceptedInvitationUseCase;
      issueInvitationUseCase: IssueInvitationUseCase;
      readInvitationStandingUseCase: ReadInvitationStandingUseCase;
      resendInvitationUseCase: ResendInvitationUseCase;
    },
  ) {}

  issue({ email }: { email: string }) {
    return this.useCases.issueInvitationUseCase.execute({ email });
  }

  ensureDelivered({ invitationId, firstName }: InvitationDeliveryDto) {
    return this.useCases.ensureInvitationDeliveredUseCase.execute({
      invitationId,
      firstName,
    });
  }

  resend({ invitationId, firstName }: InvitationDeliveryDto) {
    return this.useCases.resendInvitationUseCase.execute({
      invitationId,
      firstName,
    });
  }

  async standingOf(invitationId: string) {
    const standing =
      await this.useCases.readInvitationStandingUseCase.execute(invitationId);

    return standing
      ? {
          state: standing.state,
          sentAt: standing.sentAt.toISOString(),
          expiresAt: standing.expiresAt.toISOString(),
        }
      : null;
  }

  acceptedInvitationOf(authSubjectId: string) {
    return this.useCases.findAcceptedInvitationUseCase.execute(authSubjectId);
  }
}
