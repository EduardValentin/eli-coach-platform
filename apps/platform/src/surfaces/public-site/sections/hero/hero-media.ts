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

function heroMediaPath(fileName: string) {
  return `media/hero/${fileName}`;
}

export const HERO_PORTRAIT_POSTER: HeroPoster = {
  height: 1280,
  media: UPRIGHT_SCREEN_MEDIA_QUERY,
  path: heroMediaPath("hero-studio-poster-portrait.webp"),
  type: WEBP_TYPE,
  width: 720,
};

export const HERO_LANDSCAPE_POSTER: HeroPoster = {
  height: 900,
  media: WIDE_SCREEN_MEDIA_QUERY,
  path: heroMediaPath("hero-studio-poster-landscape.webp"),
  type: WEBP_TYPE,
  width: 1600,
};

// A browser takes the first source whose media and type it accepts, so the
// order (portrait before landscape, AV1 before H.264) makes it download one file.
export const HERO_VIDEO_SOURCES: readonly HeroVideoSource[] = [
  {
    media: UPRIGHT_SCREEN_MEDIA_QUERY,
    path: heroMediaPath("hero-studio-loop-portrait.av1.mp4"),
    type: 'video/mp4; codecs="av01.0.05M.08"',
  },
  {
    media: UPRIGHT_SCREEN_MEDIA_QUERY,
    path: heroMediaPath("hero-studio-loop-portrait.h264.mp4"),
    type: H264_TYPE,
  },
  {
    path: heroMediaPath("hero-studio-loop-landscape.av1.mp4"),
    type: 'video/mp4; codecs="av01.0.08M.08"',
  },
  {
    path: heroMediaPath("hero-studio-loop-landscape.h264.mp4"),
    type: H264_TYPE,
  },
];
