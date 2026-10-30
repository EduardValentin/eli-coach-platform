import type { ClientAvatar } from "./client-avatar";

export interface ClientAvatarsPort {
  findByClientId(clientId: string): Promise<ClientAvatar | null>;
  findByClientIds(clientIds: readonly string[]): Promise<ClientAvatar[]>;
  save(avatar: ClientAvatar): Promise<void>;
  remove(clientId: string): Promise<void>;
}
