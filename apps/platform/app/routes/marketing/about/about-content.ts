import { joinBasePath } from "@eli-coach-platform/config";

export const ABOUT_COPY = {
  bio:
    "I'm a personal trainer and nutritionist, and I work with women — online and in person. What I care about most is helping you actually understand your body, not just follow a plan. I build strength training programs around your cycle, your energy, and what your week actually looks like.",
  eyebrow: "Strength & nutrition for women",
  heading: "Meet Eli, your coach",
  normalClosing: "Ready to start? Let's build a plan you can actually stick to.",
  waitlistClosing: "Doors open soon. Get on the list so yours is held.",
} as const;

export const ABOUT_CHIPS = [
  "IFBB Certified Trainer",
  "Certified Nutritionist",
  "Women Focused",
] as const;

export const ABOUT_MEDIA = {
  heroPoster: joinBasePath(import.meta.env.BASE_URL, "media/hero/hero-training-poster.jpg"),
  heroVideoMp4: joinBasePath(import.meta.env.BASE_URL, "media/hero/hero-training-loop.mp4"),
  heroVideoWebm: joinBasePath(import.meta.env.BASE_URL, "media/hero/hero-training-loop.webm"),
} as const;

export const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/elilungu_";

const ABOUT_STORY_VIDEO_SOURCES = [
  {
    src: ABOUT_MEDIA.heroVideoWebm,
    type: "video/webm",
  },
  {
    src: ABOUT_MEDIA.heroVideoMp4,
    type: "video/mp4",
  },
] as const;

export const ABOUT_STORIES = [
  {
    alt: "Story 1 of 3",
    objectPosition: "center",
    posterSrc: ABOUT_MEDIA.heroPoster,
    videoSources: ABOUT_STORY_VIDEO_SOURCES,
  },
  {
    alt: "Story 2 of 3",
    objectPosition: "35% center",
    posterSrc: ABOUT_MEDIA.heroPoster,
    videoSources: ABOUT_STORY_VIDEO_SOURCES,
  },
  {
    alt: "Story 3 of 3",
    objectPosition: "65% center",
    posterSrc: ABOUT_MEDIA.heroPoster,
    videoSources: ABOUT_STORY_VIDEO_SOURCES,
  },
] as const;
