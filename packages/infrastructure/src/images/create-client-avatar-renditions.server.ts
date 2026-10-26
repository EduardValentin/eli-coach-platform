import {
  CLIENT_AVATAR_RENDITION,
  type ClientAvatarRendition,
  type ClientAvatarRenditions,
} from "@eli-coach-platform/domain/client-profile";

import { openAcceptedImage } from "./accepted-image.server";

const REFUSED: ClientAvatarRendition = { status: "refused" };

class SharpClientAvatarRenditions implements ClientAvatarRenditions {
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

    const { autoOrient } = await image.metadata();
    const edge = Math.min(
      CLIENT_AVATAR_RENDITION.edgePixels,
      autoOrient.width,
      autoOrient.height,
    );
    const rendered = await image
      .autoOrient()
      .resize({ width: edge, height: edge, fit: "cover" })
      .jpeg({ quality: CLIENT_AVATAR_RENDITION.quality })
      .toBuffer();

    return { status: "rendered", bytes: rendered, mimeType: "image/jpeg" };
  }
}

export function createClientAvatarRenditions(): ClientAvatarRenditions {
  return new SharpClientAvatarRenditions();
}
