import type { ClientInvitation, IdentityInvitation } from "./client-invitation";

export interface ClientInvitations {
  findById(invitationId: string): Promise<ClientInvitation | null>;
  findByClientId(clientId: string): Promise<ClientInvitation | null>;
  findByTokenHash(tokenHash: string): Promise<ClientInvitation | null>;
  insert(invitation: ClientInvitation): Promise<void>;
  reissue(invitation: ClientInvitation): Promise<void>;
  recordProvider(input: {
    invitationId: string;
    provider: IdentityInvitation;
  }): Promise<void>;
  recordEmailSent(input: { invitationId: string; at: Date }): Promise<void>;
  recordEmailDeliveryFailed(input: {
    invitationId: string;
    at: Date;
  }): Promise<void>;
  accept(input: {
    invitationId: string;
    authSubjectId: string;
    now: Date;
  }): Promise<"accepted" | "raced">;
}

export interface ClientInvitationIdGenerator {
  generate(): string;
}
