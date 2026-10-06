import sharp from "sharp";

export async function darkestGreyOf(image: Buffer): Promise<number> {
  const { channels } = await sharp(image).greyscale().stats();

  return channels[0]?.min ?? 255;
}
