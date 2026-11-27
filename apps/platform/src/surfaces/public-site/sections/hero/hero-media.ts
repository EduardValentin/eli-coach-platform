import heroLoopLandscapeAv1Path from "./media/hero-studio-loop-landscape.av1.mp4?url&no-inline";
import heroLoopLandscapeH264Path from "./media/hero-studio-loop-landscape.h264.mp4?url&no-inline";
import heroLoopPortraitAv1Path from "./media/hero-studio-loop-portrait.av1.mp4?url&no-inline";
import heroLoopPortraitH264Path from "./media/hero-studio-loop-portrait.h264.mp4?url&no-inline";
import heroPosterLandscapePath from "./media/hero-studio-poster-landscape.webp?url&no-inline";
import heroPosterPortraitPath from "./media/hero-studio-poster-portrait.webp?url&no-inline";

type HeroPoster = {
  height: number;
  media: string;
  path: string;
  type: string;
  width: number;
};

type HeroVideoSource = {
  media?: string;
  path: string;
  type: string;
};

const UPRIGHT_SCREEN_MEDIA_QUERY = "(orientation: portrait)";
const WIDE_SCREEN_MEDIA_QUERY = "(orientation: landscape)";
const H264_TYPE = "video/mp4";
const WEBP_TYPE = "image/webp";

export const HERO_PORTRAIT_POSTER: HeroPoster = {
  height: 1280,
  media: UPRIGHT_SCREEN_MEDIA_QUERY,
  path: heroPosterPortraitPath,
  type: WEBP_TYPE,
  width: 720,
};

export const HERO_LANDSCAPE_POSTER: HeroPoster = {
  height: 900,
  media: WIDE_SCREEN_MEDIA_QUERY,
  path: heroPosterLandscapePath,
  type: WEBP_TYPE,
  width: 1600,
};

// A browser takes the first source whose media and type it accepts, so the
// order (portrait before landscape, AV1 before H.264) makes it download one file.
export const HERO_VIDEO_SOURCES: readonly HeroVideoSource[] = [
  {
    media: UPRIGHT_SCREEN_MEDIA_QUERY,
    path: heroLoopPortraitAv1Path,
    type: 'video/mp4; codecs="av01.0.05M.08"',
  },
  {
    media: UPRIGHT_SCREEN_MEDIA_QUERY,
    path: heroLoopPortraitH264Path,
    type: H264_TYPE,
  },
  {
    path: heroLoopLandscapeAv1Path,
    type: 'video/mp4; codecs="av01.0.08M.08"',
  },
  {
    path: heroLoopLandscapeH264Path,
    type: H264_TYPE,
  },
];
