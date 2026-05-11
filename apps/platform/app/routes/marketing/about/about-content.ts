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
  alt: "Eli, personal trainer and nutritionist for women, smiling outdoors",
  src: "https://images.unsplash.com/photo-1757347398206-7425300ef990?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicnVuZXR0ZSUyMHNtaWxpbmclMjB3b21hbiUyMHBvcnRyYWl0JTIwb3V0ZG9vcnxlbnwxfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080",
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
