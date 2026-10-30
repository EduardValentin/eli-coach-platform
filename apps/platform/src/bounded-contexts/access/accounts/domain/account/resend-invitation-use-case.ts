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
  clockPort: ClockPort;
  identityInvitationsPort: IdentityInvitationsPort;
  accountInvitationIncidentsPort: AccountInvitationIncidentsPort;
  accountInvitationsPort: AccountInvitationsPort;
  accountInvitationNotificationsPort: AccountInvitationNotificationsPort;
  invitationTokenGeneratorPort: InvitationTokenGeneratorPort;
};

export class ResendInvitationUseCase {
  constructor(private readonly options: ResendInvitationUseCaseOptions) {}

  async execute(command: {
    invitationId: string;
    firstName: string;
  }): Promise<ResendInvitationResult> {
    const invitation = await this.options.accountInvitationsPort.findById(
      command.invitationId,
    );

    if (!invitation) {
      return { status: "not-found" };
    }

    if (invitation.isAccepted()) {
      return { status: "already-accepted" };
    }

    const now = this.options.clockPort.now();
    const token = this.options.invitationTokenGeneratorPort.create();
    const reissued = invitation.reissue({
      tokenHash: token.sha256,
      sentAt: now,
    });
    await this.options.accountInvitationsPort.reissue(reissued);

    const provider = await this.replaceIdentityInvitation(reissued).catch(
      () => null,
    );

    if (!provider) {
      this.options.accountInvitationIncidentsPort.invitationResendFailed({
        invitationId: reissued.id,
        step: "provider",
      });

      return { status: "failed" };
    }

    await this.options.accountInvitationsPort.recordProvider({
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
      ? this.options.identityInvitationsPort.replace({
          ...request,
          previous: invitation.provider,
        })
      : this.options.identityInvitationsPort.create(request);
  }

  private async sendInvitation(
    message: AccountInvitationMessage,
  ): Promise<ResendInvitationResult> {
    const { email, invitationId, sentAt } = message;
    const delivery = await this.options.accountInvitationNotificationsPort
      .sendInvitation(message)
      .catch(() => "failed" as const);

    if (delivery === "sent") {
      await this.options.accountInvitationsPort.recordEmailSent({
        invitationId,
        at: sentAt,
      });
      this.options.accountInvitationIncidentsPort.invitationResent({
        invitationId,
      });

      return { status: "sent", email };
    }

    await this.options.accountInvitationsPort.recordEmailDeliveryFailed({
      invitationId,
      at: sentAt,
    });
    this.options.accountInvitationIncidentsPort.invitationResendFailed({
      invitationId,
      step: "email",
    });

    return { status: "failed" };
  }
}
