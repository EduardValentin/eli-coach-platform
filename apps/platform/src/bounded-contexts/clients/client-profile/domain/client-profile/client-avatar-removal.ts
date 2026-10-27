import type { ClientAvatar } from "./client-avatar";
import type { ClientAvatarIncidents } from "./client-avatar-incidents";
import type { ClientAvatarStore } from "./client-avatar-store";
import type { ClientAvatars } from "./client-avatars";

export type ClientAvatarRemovalOptions = {
  avatars: Pick<ClientAvatars, "findByClientId" | "remove">;
  store: Pick<ClientAvatarStore, "delete">;
  incidents: ClientAvatarIncidents;
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
