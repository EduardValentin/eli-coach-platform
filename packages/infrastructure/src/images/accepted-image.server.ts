import sharp, { type Sharp } from "sharp";

const INPUT_PIXEL_LIMIT = 60_000_000;
const ACCEPTED_FORMATS: ReadonlySet<string> = new Set(["jpeg", "png", "webp"]);

export async function openAcceptedImage(
  bytes: Uint8Array,
): Promise<Sharp | null> {
  const image = sharp(bytes, {
    failOn: "error",
    limitInputPixels: INPUT_PIXEL_LIMIT,
  });
  const { format } = await image.metadata();

  return ACCEPTED_FORMATS.has(format) ? image : null;
}
