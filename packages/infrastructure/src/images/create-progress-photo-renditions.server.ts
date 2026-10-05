import type {
  ProgressPhotoRendition,
  ProgressPhotoRenditions,
} from "@eli-coach-platform/domain/client-profile";

import { openAcceptedImage } from "./accepted-image.server";

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

  const jpegBytes = await photo
    .rotate()
    .resize({
      width: LONGEST_EDGE_PIXELS,
      height: LONGEST_EDGE_PIXELS,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  return { status: "rendered", bytes: jpegBytes, mimeType: "image/jpeg" };
}

export function createProgressPhotoRenditions(): ProgressPhotoRenditions {
  return new SharpProgressPhotoRenditions();
}
