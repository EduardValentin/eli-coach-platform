import type { AccountInvitations } from "./account-invitations";
import type { InvitationResendOutcome } from "./client-invitation";
import type { InvitedClients } from "./invited-client";

type ResendInvitationResult =
  | { status: "sent"; email: string }
  | { status: "failed" }
  | { status: "already-admitted" }
  | { status: "subscription-cancelled-or-ended" }
  | { status: "not-found" };

type ResendInvitationUseCaseOptions = {
  accountInvitations: Pick<AccountInvitations, "resend">;
  clients: Pick<InvitedClients, "findById">;
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
