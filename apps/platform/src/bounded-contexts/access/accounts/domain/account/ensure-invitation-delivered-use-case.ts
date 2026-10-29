import type { Clock } from "../clock";

import type { AccountInvitation } from "./account-invitation";
import type { AccountInvitationIncidents } from "./account-invitation-incidents";
import type {
  AccountInvitationMessage,
  AccountInvitationNotifications,
} from "./account-invitation-notifications";
import type { AccountInvitations } from "./account-invitations";
import type { IdentityInvitations } from "./identity-invitations";
import type { InvitationTokenGenerator } from "./invitation-token";

type EnsureInvitationDeliveredUseCaseOptions = {
  clock: Clock;
  identity: IdentityInvitations;
  incidents: AccountInvitationIncidents;
  invitations: AccountInvitations;
  notifications: AccountInvitationNotifications;
  tokenGenerator: InvitationTokenGenerator;
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
      invitation,
      firstName: command.firstName,
      rawToken: token.rawToken,
      now,
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

  private async sendInvitation(sending: {
    invitation: AccountInvitation;
    firstName: string;
    rawToken: string;
    now: Date;
  }): Promise<void> {
    const invitationId = sending.invitation.id;
    const delivery = await this.deliver({
      invitationId,
      email: sending.invitation.email,
      firstName: sending.firstName,
      rawToken: sending.rawToken,
      sentAt: sending.invitation.sentAt,
      expiresAt: sending.invitation.expiresAt,
    });

    if (delivery === "sent") {
      await this.options.invitations.recordEmailSent({
        invitationId,
        at: sending.now,
      });
      return;
    }

    await this.options.invitations.recordEmailDeliveryFailed({
      invitationId,
      at: sending.now,
    });
    this.options.incidents.invitationEmailFailed({ invitationId });
  }

  private async deliver(
    message: AccountInvitationMessage,
  ): Promise<"sent" | "failed"> {
    try {
      return await this.options.notifications.sendInvitation(message);
    } catch {
      return "failed";
    }
  }
}
