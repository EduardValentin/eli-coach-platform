import type { Clock } from "../shared";

import { ClientInvitation } from "./client-invitation";
import type { ClientInvitationIncidents } from "./client-invitation-incidents";
import type {
  ClientInvitationMessage,
  ClientInvitationNotifications,
} from "./client-invitation-notifications";
import type {
  ClientInvitationIdGenerator,
  ClientInvitations,
} from "./client-invitations";
import type { IdentityInvitations } from "./identity-invitations";
import type { InvitationTokenGenerator } from "./invitation-token";
import type { InvitedClient, InvitedClients } from "./invited-client";

type AdmitPaidClientResult =
  { status: "invited" } | { status: "already-admitted" };

type AdmitPaidClientUseCaseOptions = {
  clients: InvitedClients;
  clock: Clock;
  identity: IdentityInvitations;
  incidents: ClientInvitationIncidents;
  invitationIds: ClientInvitationIdGenerator;
  invitations: ClientInvitations;
  notifications: ClientInvitationNotifications;
  tokenGenerator: InvitationTokenGenerator;
};

type PreparedInvitation = {
  invitation: ClientInvitation;
  tokenToEmail: string | null;
};

export class AdmitPaidClientUseCase {
  constructor(private readonly options: AdmitPaidClientUseCaseOptions) {}

  async execute(command: { clientId: string }): Promise<AdmitPaidClientResult> {
    const client = await this.options.clients.findById(command.clientId);

    if (!client) {
      throw new Error(`Paid client ${command.clientId} does not exist.`);
    }

    if (client.authSubjectId) {
      return { status: "already-admitted" };
    }

    const now = this.options.clock.now();
    const { invitation, tokenToEmail } = await this.prepareInvitation(
      client,
      now,
    );

    await this.ensureIdentityInvitation(invitation);

    if (tokenToEmail) {
      await this.sendInvitation({
        invitation,
        firstName: client.firstName,
        rawToken: tokenToEmail,
        now,
      });
    }

    return { status: "invited" };
  }

  private async prepareInvitation(
    client: InvitedClient,
    now: Date,
  ): Promise<PreparedInvitation> {
    const existing = await this.options.invitations.findByClientId(client.id);

    if (!existing) {
      return this.issueInvitation(client, now);
    }

    if (existing.awaitsEmail()) {
      return this.reissueInvitation(existing, now);
    }

    return { invitation: existing, tokenToEmail: null };
  }

  private async issueInvitation(
    client: InvitedClient,
    now: Date,
  ): Promise<PreparedInvitation> {
    const token = this.options.tokenGenerator.create();
    const invitation = ClientInvitation.issue({
      id: this.options.invitationIds.generate(),
      clientId: client.id,
      email: client.email,
      tokenHash: token.sha256,
      sentAt: now,
    });

    await this.options.invitations.insert(invitation);

    return { invitation, tokenToEmail: token.rawToken };
  }

  private async reissueInvitation(
    existing: ClientInvitation,
    now: Date,
  ): Promise<PreparedInvitation> {
    const token = this.options.tokenGenerator.create();
    const invitation = existing.reissue({
      tokenHash: token.sha256,
      sentAt: now,
    });

    await this.options.invitations.reissue(invitation);

    return { invitation, tokenToEmail: token.rawToken };
  }

  private async ensureIdentityInvitation(
    invitation: ClientInvitation,
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
    invitation: ClientInvitation;
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
    message: ClientInvitationMessage,
  ): Promise<"sent" | "failed"> {
    try {
      return await this.options.notifications.sendInvitation(message);
    } catch {
      return "failed";
    }
  }
}
