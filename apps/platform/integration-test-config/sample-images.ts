import sharp, { type Sharp } from "sharp";

export type ImageFacts = {
  format: string;
  width: number;
  height: number;
  hasExif: boolean;
};

const LANDSCAPE_CAMERA_FRAME = { width: 2400, height: 1800 };

const SMALL_FRAME = { width: 640, height: 480 };

const ROTATE_CLOCKWISE_TO_VIEW = 6;

const BUCHAREST_LOCATION = {
  GPSLatitudeRef: "N",
  GPSLatitude: "44/1 25/1 0/1",
  GPSLongitudeRef: "E",
  GPSLongitude: "26/1 6/1 0/1",
};

function solidFrame(frame: { width: number; height: number }): Sharp {
  return sharp({
    create: {
      ...frame,
      channels: 3,
      background: { r: 196, g: 128, b: 104 },
    },
  });
}

export async function cameraJpegWithOrientationAndLocation(): Promise<Buffer> {
  return solidFrame(LANDSCAPE_CAMERA_FRAME)
    .jpeg()
    .withMetadata({ orientation: ROTATE_CLOCKWISE_TO_VIEW })
    .withExifMerge({ IFD3: BUCHAREST_LOCATION })
    .toBuffer();
}

export async function landscapePng(): Promise<Buffer> {
  return solidFrame(LANDSCAPE_CAMERA_FRAME).png().toBuffer();
}

export async function smallWebp(): Promise<Buffer> {
  return solidFrame(SMALL_FRAME).webp().toBuffer();
}

export async function imageFactsOf(bytes: Uint8Array): Promise<ImageFacts> {
  const metadata = await sharp(bytes).metadata();

  return {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    hasExif: metadata.exif !== undefined,
  };
}
