import {
  CLIENT_AVATAR_RENDITION,
  type ClientAvatarRendition,
  type ClientAvatarRenditionsPort,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";

import { openAcceptedImage } from "~/shared/images/sharp-renditions.server";

const REFUSED: ClientAvatarRendition = { status: "refused" };

export class SharpClientAvatarRenditionsAdapter implements ClientAvatarRenditionsPort {
  async render(bytes: Uint8Array): Promise<ClientAvatarRendition> {
    try {
      return await this.renderAcceptedImage(bytes);
    } catch {
      return REFUSED;
    }
  }

  private async renderAcceptedImage(
    bytes: Uint8Array,
  ): Promise<ClientAvatarRendition> {
    const image = await openAcceptedImage(bytes);

    if (image === null) {
      return REFUSED;
    }

    const { width, height } = await image.orientedSize();
    const edge = Math.min(CLIENT_AVATAR_RENDITION.edgePixels, width, height);
    const rendered = await image.coverSquare(edge, {
      format: "jpeg",
      quality: CLIENT_AVATAR_RENDITION.quality,
    });

    return { status: "rendered", bytes: rendered, mimeType: "image/jpeg" };
  }
}
