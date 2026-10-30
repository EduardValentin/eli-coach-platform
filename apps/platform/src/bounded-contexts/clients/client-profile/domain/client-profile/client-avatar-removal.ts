import type { ClientAvatar } from "./client-avatar";
import type { ClientAvatarIncidentsPort } from "./client-avatar-incidents-port";
import type { ClientAvatarStorePort } from "./client-avatar-store-port";
import type { ClientAvatarsPort } from "./client-avatars-port";

export type ClientAvatarRemovalOptions = {
  avatars: Pick<ClientAvatarsPort, "findByClientId" | "remove">;
  store: Pick<ClientAvatarStorePort, "delete">;
  incidents: ClientAvatarIncidentsPort;
};

export class ClientAvatarRemoval {
  constructor(private readonly options: ClientAvatarRemovalOptions) {}

  async remove(clientId: string): Promise<void> {
    const current = await this.options.avatars.findByClientId(clientId);

    if (!current) {
      return;
    }

    await this.options.avatars.remove(clientId);
    await this.discardFileOf(current);
  }

  async discardFileOf(avatar: ClientAvatar | null): Promise<void> {
    if (!avatar) {
      return;
    }

    const { clientId, reference } = avatar.toSnapshot();

    try {
      await this.options.store.delete(reference);
    } catch {
      this.options.incidents.clientAvatarFileOrphaned({
        clientId,
        storageKey: reference.storageKey,
      });
    }
  }
}
