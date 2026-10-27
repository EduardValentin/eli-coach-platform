import sharp, { type Sharp } from "sharp";

const INPUT_PIXEL_LIMIT = 60_000_000;
const ACCEPTED_FORMATS: ReadonlySet<string> = new Set(["jpeg", "png", "webp"]);

export type ImageEncoding = { format: "jpeg" | "webp"; quality: number };

type ImageSize = { width: number; height: number };

class AcceptedImage {
  constructor(private readonly image: Sharp) {}

  async orientedSize(): Promise<ImageSize> {
    const { autoOrient } = await this.image.metadata();

    return { width: autoOrient.width, height: autoOrient.height };
  }

  coverSquare(edge: number, encoding: ImageEncoding): Promise<Uint8Array> {
    return this.image
      .autoOrient()
      .resize({ width: edge, height: edge, fit: "cover" })
      .toFormat(encoding.format, { quality: encoding.quality })
      .toBuffer();
  }

  fitInside(longEdge: number, encoding: ImageEncoding): Promise<Uint8Array> {
    return fittedInside(this.image.autoOrient(), longEdge, encoding);
  }
}

export async function openAcceptedImage(
  bytes: Uint8Array,
): Promise<AcceptedImage | null> {
  const image = sharp(bytes, {
    failOn: "error",
    limitInputPixels: INPUT_PIXEL_LIMIT,
  });
  const { format } = await image.metadata();

  return ACCEPTED_FORMATS.has(format) ? new AcceptedImage(image) : null;
}

export function fitRenderedImageInside(
  bytes: Uint8Array,
  longEdge: number,
  encoding: ImageEncoding,
): Promise<Uint8Array> {
  return fittedInside(sharp(bytes), longEdge, encoding);
}

function fittedInside(
  image: Sharp,
  longEdge: number,
  encoding: ImageEncoding,
): Promise<Uint8Array> {
  return image
    .resize({
      width: longEdge,
      height: longEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toFormat(encoding.format, { quality: encoding.quality })
    .toBuffer();
}
