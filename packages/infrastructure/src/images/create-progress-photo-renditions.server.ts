import type {
  ProgressPhotoRendition,
  ProgressPhotoRenditions,
} from "@eli-coach-platform/domain/client-profile";
import sharp from "sharp";

const LONGEST_EDGE_PIXELS = 1600;
const JPEG_QUALITY = 82;
const INPUT_PIXEL_LIMIT = 60_000_000;
const ACCEPTED_FORMATS: ReadonlySet<string> = new Set(["jpeg", "png", "webp"]);
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
  const photo = sharp(bytes, {
    failOn: "error",
    limitInputPixels: INPUT_PIXEL_LIMIT,
  });
  const { format } = await photo.metadata();

  if (!ACCEPTED_FORMATS.has(format)) {
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
