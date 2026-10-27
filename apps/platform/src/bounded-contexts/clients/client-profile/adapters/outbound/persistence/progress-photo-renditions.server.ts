import type {
  ProgressPhotoRendition,
  ProgressPhotoRenditions,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";

import { openAcceptedImage } from "~/shared/images/sharp-renditions.server";

const LONGEST_EDGE_PIXELS = 1600;
const JPEG_QUALITY = 82;
const REFUSED: ProgressPhotoRendition = { status: "refused" };

class SharpProgressPhotoRenditions implements ProgressPhotoRenditions {
  async render(bytes: Uint8Array): Promise<ProgressPhotoRendition> {
    try {
      return await renderAcceptedPhoto(bytes);
    } catch {
      return REFUSED;
    }
  }
}

async function renderAcceptedPhoto(
  bytes: Uint8Array,
): Promise<ProgressPhotoRendition> {
  const photo = await openAcceptedImage(bytes);

  if (photo === null) {
    return REFUSED;
  }

  const jpegBytes = await photo.fitInside(LONGEST_EDGE_PIXELS, {
    format: "jpeg",
    quality: JPEG_QUALITY,
  });

  return { status: "rendered", bytes: jpegBytes, mimeType: "image/jpeg" };
}

export function createProgressPhotoRenditions(): ProgressPhotoRenditions {
  return new SharpProgressPhotoRenditions();
}
