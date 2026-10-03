import type { Clock } from "../shared";

import type { ClientInvitation, IdentityInvitation } from "./client-invitation";
import type { ClientInvitationIncidents } from "./client-invitation-incidents";
import type {
  ClientInvitationMessage,
  ClientInvitationNotifications,
} from "./client-invitation-notifications";
import type { ClientInvitations } from "./client-invitations";
import type { IdentityInvitations } from "./identity-invitations";
import type { InvitationTokenGenerator } from "./invitation-token";
import type { InvitedClients } from "./invited-client";

type ResendInvitationResult =
  | { status: "sent"; email: string }
  | { status: "failed" }
  | { status: "already-admitted" }
  | { status: "coaching-closed" }
  | { status: "not-found" };

type ResendInvitationUseCaseOptions = {
  clients: InvitedClients;
  clock: Clock;
  identity: IdentityInvitations;
  incidents: ClientInvitationIncidents;
  invitations: ClientInvitations;
  notifications: ClientInvitationNotifications;
  tokenGenerator: InvitationTokenGenerator;
};

export class ResendInvitationUseCase {
  constructor(private readonly options: ResendInvitationUseCaseOptions) {}

  async execute(clientId: string): Promise<ResendInvitationResult> {
    const [client, invitation] = await Promise.all([
      this.options.clients.findById(clientId),
      this.options.invitations.findByClientId(clientId),
    ]);

    if (!client || !invitation) {
      return { status: "not-found" };
    }

    if (client.coachingClosed) {
      return { status: "coaching-closed" };
    }

    if (client.authSubjectId || invitation.usedAt) {
      return { status: "already-admitted" };
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
      firstName: client.firstName,
      rawToken: token.rawToken,
      sentAt: reissued.sentAt,
      expiresAt: reissued.expiresAt,
    });
  }

  private async replaceIdentityInvitation(
    invitation: ClientInvitation,
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
    message: ClientInvitationMessage,
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
