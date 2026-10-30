import type { AccountInvitationsPort } from "./account-invitations-port";
import type { InvitationResendOutcome } from "./client-invitation";
import type { InvitedClientsPort } from "./invited-clients-port";

type ResendInvitationResult =
  | { status: "sent"; email: string }
  | { status: "failed" }
  | { status: "already-admitted" }
  | { status: "subscription-cancelled-or-ended" }
  | { status: "not-found" };

type ResendInvitationUseCaseOptions = {
  accountInvitations: Pick<AccountInvitationsPort, "resend">;
  clients: Pick<InvitedClientsPort, "findById">;
};

export class ResendInvitationUseCase {
  constructor(private readonly options: ResendInvitationUseCaseOptions) {}

  async execute(clientId: string): Promise<ResendInvitationResult> {
    const client = await this.options.clients.findById(clientId);

    if (!client?.accountInvitationId) {
      return { status: "not-found" };
    }

    if (client.coachingCancelledOrEnded) {
      return { status: "subscription-cancelled-or-ended" };
    }

    if (client.authSubjectId) {
      return { status: "already-admitted" };
    }

    return this.resultOf(
      await this.options.accountInvitations.resend({
        invitationId: client.accountInvitationId,
        firstName: client.firstName,
      }),
    );
  }

  private resultOf(outcome: InvitationResendOutcome): ResendInvitationResult {
    return outcome.status === "already-accepted"
      ? { status: "already-admitted" }
      : outcome;
  }
}
