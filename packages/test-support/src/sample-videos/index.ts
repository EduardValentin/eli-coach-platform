import { fileURLToPath } from "node:url";

export const LANDSCAPE_SAMPLE_VIDEO_PATH = fileURLToPath(
  new URL("./landscape.mp4", import.meta.url),
);

export const PORTRAIT_SAMPLE_VIDEO_PATH = fileURLToPath(
  new URL("./portrait.mov", import.meta.url),
);
