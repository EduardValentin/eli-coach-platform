import sharp from "sharp";

export const DARK_INK = 128;

export async function darkestGreyOf(image: Buffer): Promise<number> {
  const { channels } = await sharp(image).greyscale().stats();

  return channels[0]?.min ?? 255;
}
