import type { ClockPort } from "../clock-port";

import type {
  AccountInvitation,
  IdentityInvitation,
} from "./account-invitation";
import type { AccountInvitationIncidentsPort } from "./account-invitation-incidents-port";
import type {
  AccountInvitationMessage,
  AccountInvitationNotificationsPort,
} from "./account-invitation-notifications-port";
import type { AccountInvitationsPort } from "./account-invitations-port";
import type { IdentityInvitationsPort } from "./identity-invitations-port";
import type { InvitationTokenGeneratorPort } from "./invitation-token-generator-port";

export type ResendInvitationResult =
  | { status: "sent"; email: string }
  | { status: "failed" }
  | { status: "already-accepted" }
  | { status: "not-found" };

type ResendInvitationUseCaseOptions = {
  clock: ClockPort;
  identity: IdentityInvitationsPort;
  incidents: AccountInvitationIncidentsPort;
  invitations: AccountInvitationsPort;
  notifications: AccountInvitationNotificationsPort;
  tokenGenerator: InvitationTokenGeneratorPort;
};

export class ResendInvitationUseCase {
  constructor(private readonly options: ResendInvitationUseCaseOptions) {}

  async execute(command: {
    invitationId: string;
    firstName: string;
  }): Promise<ResendInvitationResult> {
    const invitation = await this.options.invitations.findById(
      command.invitationId,
    );

    if (!invitation) {
      return { status: "not-found" };
    }

    if (invitation.isAccepted()) {
      return { status: "already-accepted" };
    }

    const now = this.options.clock.now();
    const token = this.options.tokenGenerator.create();
    const reissued = invitation.reissue({
      tokenHash: token.sha256,
      sentAt: now,
    });
    await this.options.invitations.reissue(reissued);

    const provider = await this.replaceIdentityInvitation(reissued).catch(
      () => null,
    );

    if (!provider) {
      this.options.incidents.invitationResendFailed({
        invitationId: reissued.id,
        step: "provider",
      });

      return { status: "failed" };
    }

    await this.options.invitations.recordProvider({
      invitationId: reissued.id,
      provider,
    });

    return this.sendInvitation({
      invitationId: reissued.id,
      email: reissued.email,
      firstName: command.firstName,
      rawToken: token.rawToken,
      sentAt: reissued.sentAt,
      expiresAt: reissued.expiresAt,
    });
  }

  private async replaceIdentityInvitation(
    invitation: AccountInvitation,
  ): Promise<IdentityInvitation> {
    const request = { email: invitation.email, invitationId: invitation.id };

    return invitation.provider
      ? this.options.identity.replace({
          ...request,
          previous: invitation.provider,
        })
      : this.options.identity.create(request);
  }

  private async sendInvitation(
    message: AccountInvitationMessage,
  ): Promise<ResendInvitationResult> {
    const { email, invitationId, sentAt } = message;
    const delivery = await this.options.notifications
      .sendInvitation(message)
      .catch(() => "failed" as const);

    if (delivery === "sent") {
      await this.options.invitations.recordEmailSent({
        invitationId,
        at: sentAt,
      });
      this.options.incidents.invitationResent({ invitationId });

      return { status: "sent", email };
    }

    await this.options.invitations.recordEmailDeliveryFailed({
      invitationId,
      at: sentAt,
    });
    this.options.incidents.invitationResendFailed({
      invitationId,
      step: "email",
    });

    return { status: "failed" };
  }
}
