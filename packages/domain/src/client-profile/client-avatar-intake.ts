import type { Clock } from "../shared";

import { ClientAvatar } from "./client-avatar";
import type { ClientAvatarIds } from "./client-avatar-ids";
import type { ClientAvatarIncidents } from "./client-avatar-incidents";
import type {
  ClientAvatarRendition,
  ClientAvatarRenditions,
} from "./client-avatar-renditions";
import type { ClientAvatarStore } from "./client-avatar-store";
import type { ClientAvatars } from "./client-avatars";
import type { ProgressPhotoFileFacts } from "./progress-photo";

export type ReceivedClientAvatar = ProgressPhotoFileFacts & {
  bytes: Uint8Array;
};

export type ClientAvatarUpload =
  | { status: "uploaded" }
  | { status: "refused"; reason: "not-accepted" | "rendition-refused" };

export type ClientAvatarIntakeOptions = {
  avatars: ClientAvatars;
  avatarIds: ClientAvatarIds;
  store: ClientAvatarStore;
  renditions: ClientAvatarRenditions;
  incidents: ClientAvatarIncidents;
  clock: Clock;
};

const REFUSED_RENDITION: ClientAvatarRendition = { status: "refused" };

export class ClientAvatarIntake {
  constructor(private readonly options: ClientAvatarIntakeOptions) {}

  async upload(
    clientId: string,
    received: ReceivedClientAvatar,
  ): Promise<ClientAvatarUpload> {
    if (!ClientAvatar.accepts(received)) {
      return { status: "refused", reason: "not-accepted" };
    }

    const rendition = await this.options.renditions
      .render(received.bytes)
      .catch(() => REFUSED_RENDITION);

    if (rendition.status === "refused") {
      return { status: "refused", reason: "rendition-refused" };
    }

    const previous = await this.options.avatars.findByClientId(clientId);
    const avatarId = this.options.avatarIds.generate();
    const reference = await this.options.store.store(
      { clientId, avatarId },
      rendition.bytes,
    );

    await this.options.avatars.save(
      ClientAvatar.uploaded({
        avatarId,
        clientId,
        reference,
        rendition,
        at: this.options.clock.now(),
      }),
    );
    await this.deleteFileOf(previous);

    return { status: "uploaded" };
  }

  async remove(clientId: string): Promise<void> {
    const current = await this.options.avatars.findByClientId(clientId);

    if (!current) {
      return;
    }

    await this.options.avatars.remove(clientId);
    await this.deleteFileOf(current);
  }

  private async deleteFileOf(avatar: ClientAvatar | null): Promise<void> {
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
