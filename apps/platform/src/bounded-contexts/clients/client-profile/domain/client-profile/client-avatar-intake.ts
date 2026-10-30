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
  clientAvatarsPort: ClientAvatarsPort;
  clientAvatarIdsPort: ClientAvatarIdsPort;
  clientAvatarStorePort: ClientAvatarStorePort;
  clientAvatarRenditionsPort: ClientAvatarRenditionsPort;
  clientAvatarIncidentsPort: ClientAvatarIncidentsPort;
  clockPort: ClockPort;
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

    const rendition = await this.options.clientAvatarRenditionsPort
      .render(received.bytes)
      .catch(() => REFUSED_RENDITION);

    if (rendition.status === "refused") {
      return { status: "refused", reason: "rendition-refused" };
    }

    const previous =
      await this.options.clientAvatarsPort.findByClientId(clientId);
    const avatarId = this.options.clientAvatarIdsPort.generate();
    const reference = await this.options.clientAvatarStorePort.store(
      { clientId, avatarId },
      rendition.bytes,
    );

    await this.options.clientAvatarsPort.save(
      ClientAvatar.uploaded({
        avatarId,
        clientId,
        reference,
        rendition,
        at: this.options.clockPort.now(),
      }),
    );
    await new ClientAvatarRemoval(this.options).discardFileOf(previous);

    return { status: "uploaded" };
  }
}
