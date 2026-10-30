import type { ClockPort } from "../clock-port";

import { ClientAvatar } from "./client-avatar";
import type { ClientAvatarIdsPort } from "./client-avatar-ids-port";
import type { ClientAvatarIncidentsPort } from "./client-avatar-incidents-port";
import type {
  ClientAvatarRendition,
  ClientAvatarRenditionsPort,
} from "./client-avatar-renditions-port";
import type { ClientAvatarStorePort } from "./client-avatar-store-port";
import type { ClientAvatarsPort } from "./client-avatars-port";
import { ClientAvatarRemoval } from "./client-avatar-removal";
import type { ProgressPhotoFileFacts } from "./progress-photo";

export type ReceivedClientAvatar = ProgressPhotoFileFacts & {
  bytes: Uint8Array;
};

export type ClientAvatarUpload =
  | { status: "uploaded" }
  | { status: "refused"; reason: "not-accepted" | "rendition-refused" };

export type ClientAvatarIntakeOptions = {
  avatars: ClientAvatarsPort;
  avatarIds: ClientAvatarIdsPort;
  store: ClientAvatarStorePort;
  renditions: ClientAvatarRenditionsPort;
  incidents: ClientAvatarIncidentsPort;
  clock: ClockPort;
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
    await new ClientAvatarRemoval(this.options).discardFileOf(previous);

    return { status: "uploaded" };
  }
}
