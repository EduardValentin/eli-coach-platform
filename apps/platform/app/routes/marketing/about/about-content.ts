import { joinBasePath } from "@eli-coach-platform/config";

export const ABOUT_INSTAGRAM_URL = "https://www.instagram.com/elilungu_";
export const ABOUT_INSTAGRAM_HANDLE = "@elilungu_";

export const ABOUT_CREDENTIAL_CHIPS = [
  "IFBB Certified Trainer",
  "Certified Nutritionist",
  "Women Focused",
] as const;

export const ABOUT_BIO_COPY =
  "I'm a personal trainer and nutritionist, and I work with women — online and in person. What I care about most is helping you actually understand your body, not just follow a plan. I build strength training programs around your cycle, your energy, and what your week actually looks like.";

export const ABOUT_NORMAL_CLOSING_LINE =
  "Ready to start? Let's build a plan you can actually stick to.";

export const ABOUT_WAITLIST_CLOSING_LINE =
  "Doors open soon. Get on the list so yours is held.";

export const ABOUT_PORTRAIT = {
  alt: "Eli training with a medicine ball in a gym",
  src: joinBasePath(import.meta.env.BASE_URL, "media/about/eli-training-portrait.jpg"),
} as const;

export const ABOUT_STORY_DURATION_MS = 5_000;

export const ABOUT_STORY_POSTER_SOURCE = joinBasePath(
  import.meta.env.BASE_URL,
  "media/hero/hero-training-poster.jpg",
);

export const ABOUT_STORY_VIDEO_SOURCES = [
  {
    src: joinBasePath(import.meta.env.BASE_URL, "media/hero/hero-training-loop.webm"),
    type: "video/webm",
  },
  {
    src: joinBasePath(import.meta.env.BASE_URL, "media/hero/hero-training-loop.mp4"),
    type: "video/mp4",
  },
] as const;

export type AboutStory = {
  id: string;
  label: string;
  durationMs: number;
  poster: string;
  sources: typeof ABOUT_STORY_VIDEO_SOURCES;
};

export const ABOUT_STORIES: AboutStory[] = [
  {
    durationMs: ABOUT_STORY_DURATION_MS,
    id: "strength-session",
    label: "Strength session preview",
    poster: ABOUT_STORY_POSTER_SOURCE,
    sources: ABOUT_STORY_VIDEO_SOURCES,
  },
  {
    durationMs: ABOUT_STORY_DURATION_MS,
    id: "coaching-check-in",
    label: "Coaching check-in preview",
    poster: ABOUT_STORY_POSTER_SOURCE,
    sources: ABOUT_STORY_VIDEO_SOURCES,
  },
  {
    durationMs: ABOUT_STORY_DURATION_MS,
    id: "cycle-aware-plan",
    label: "Cycle-aware plan preview",
    poster: ABOUT_STORY_POSTER_SOURCE,
    sources: ABOUT_STORY_VIDEO_SOURCES,
  },
];
