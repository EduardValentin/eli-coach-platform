import type { ClockPort } from "../clock-port";

import type { AccountInvitation } from "./account-invitation";
import type { AccountInvitationIncidentsPort } from "./account-invitation-incidents-port";
import type {
  AccountInvitationMessage,
  AccountInvitationNotificationsPort,
} from "./account-invitation-notifications-port";
import type { AccountInvitationsPort } from "./account-invitations-port";
import type { IdentityInvitationsPort } from "./identity-invitations-port";
import type { InvitationTokenGeneratorPort } from "./invitation-token-generator-port";

type EnsureInvitationDeliveredUseCaseOptions = {
  clock: ClockPort;
  identity: IdentityInvitationsPort;
  incidents: AccountInvitationIncidentsPort;
  invitations: AccountInvitationsPort;
  notifications: AccountInvitationNotificationsPort;
  tokenGenerator: InvitationTokenGeneratorPort;
};

export class EnsureInvitationDeliveredUseCase {
  constructor(
    private readonly options: EnsureInvitationDeliveredUseCaseOptions,
  ) {}

  async execute(command: {
    invitationId: string;
    firstName: string;
  }): Promise<void> {
    const existing = await this.options.invitations.findById(
      command.invitationId,
    );

    if (!existing) {
      throw new Error(
        `Account invitation ${command.invitationId} does not exist.`,
      );
    }

    if (!existing.awaitsEmail()) {
      return;
    }

    const now = this.options.clock.now();
    const token = this.options.tokenGenerator.create();
    const invitation = existing.reissue({
      tokenHash: token.sha256,
      sentAt: now,
    });

    await this.options.invitations.reissue(invitation);
    await this.ensureIdentityInvitation(invitation);
    await this.sendInvitation({
      invitationId: invitation.id,
      email: invitation.email,
      firstName: command.firstName,
      rawToken: token.rawToken,
      sentAt: invitation.sentAt,
      expiresAt: invitation.expiresAt,
    });
  }

  private async ensureIdentityInvitation(
    invitation: AccountInvitation,
  ): Promise<void> {
    if (invitation.provider) {
      return;
    }

    const provider = await this.options.identity.create({
      email: invitation.email,
      invitationId: invitation.id,
    });

    await this.options.invitations.recordProvider({
      invitationId: invitation.id,
      provider,
    });
  }

  private async sendInvitation(
    message: AccountInvitationMessage,
  ): Promise<void> {
    const { invitationId, sentAt } = message;
    const delivery = await this.options.notifications
      .sendInvitation(message)
      .catch(() => "failed" as const);

    if (delivery === "sent") {
      await this.options.invitations.recordEmailSent({
        invitationId,
        at: sentAt,
      });
      return;
    }

    await this.options.invitations.recordEmailDeliveryFailed({
      invitationId,
      at: sentAt,
    });
    this.options.incidents.invitationEmailFailed({ invitationId });
  }
}
