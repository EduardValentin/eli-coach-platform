type HeroVideoSource = {
  media?: string;
  path: string;
  type: string;
};

const PHONE_MEDIA_QUERY = "(max-width: 767px)";
const H264_TYPE = "video/mp4";

function heroMediaPath(fileName: string) {
  return `media/hero/${fileName}`;
}

export const HERO_POSTER_PATH = heroMediaPath("hero-studio-poster.webp");

const HERO_PHONE_VIDEO_SOURCES: readonly HeroVideoSource[] = [
  {
    path: heroMediaPath("hero-studio-loop-720.av1.mp4"),
    type: 'video/mp4; codecs="av01.0.05M.08"',
  },
  { path: heroMediaPath("hero-studio-loop-720.h264.mp4"), type: H264_TYPE },
];

// A browser takes the first source whose media and type it accepts, so the
// order (phone before desktop, AV1 before H.264) makes it download one file.
export const HERO_VIDEO_SOURCES: readonly HeroVideoSource[] = [
  ...HERO_PHONE_VIDEO_SOURCES.map((source) => ({
    ...source,
    media: PHONE_MEDIA_QUERY,
  })),
  {
    path: heroMediaPath("hero-studio-loop-1080.av1.mp4"),
    type: 'video/mp4; codecs="av01.0.08M.08"',
  },
  { path: heroMediaPath("hero-studio-loop-1080.h264.mp4"), type: H264_TYPE },
];
