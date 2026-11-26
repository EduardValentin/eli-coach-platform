import { ELI_PORTRAIT_PATHS } from "~/shared/brand";
import {
  HERO_PHONE_VIDEO_SOURCES,
  HERO_POSTER_PATH,
} from "~/surfaces/public-site/sections/hero/hero-media";

export const ABOUT_COPY = {
  bioParagraphs: [
    "I am a personal trainer and nutrition coach, working with women who want to build strength, improve their nutrition, and feel stronger and healthier.",
    "My approach is shaped by both my professional experience and my own personal journey with training, nutrition, and learning how to better understand my body.",
    "My goal is to give you the tools, structure, and support to build a healthier relationship with food, feel more connected to your body, and make progress in a way that feels realistic, flexible, and sustainable.",
    "I create training and nutrition plans around your goals, your menstrual cycle, your energy levels, and what your week actually looks like.",
  ],
  eyebrow: "Strength & nutrition for women",
  heading: "Meet Eli, your coach",
  normalClosing:
    "Ready to start? Book a free 30-minute call and let's see if we're a fit.",
  waitlistClosing: "Doors open soon. Get on the list so yours is held.",
} as const;

export const ABOUT_CHIPS = [
  "IFBB Certified Trainer",
  "Certified Nutritionist",
  "Women Focused",
] as const;

export const ABOUT_MEDIA = {
  eliPortraitLarge: ELI_PORTRAIT_PATHS.large,
  eliPortraitSmall: ELI_PORTRAIT_PATHS.small,
} as const;

export const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/elilungu_";

export const ABOUT_STORIES = [
  {
    alt: "Story 1 of 3",
    objectPosition: "center",
    posterPath: HERO_POSTER_PATH,
    videoSources: HERO_PHONE_VIDEO_SOURCES,
  },
  {
    alt: "Story 2 of 3",
    objectPosition: "40% center",
    posterPath: HERO_POSTER_PATH,
    videoSources: HERO_PHONE_VIDEO_SOURCES,
  },
  {
    alt: "Story 3 of 3",
    objectPosition: "60% center",
    posterPath: HERO_POSTER_PATH,
    videoSources: HERO_PHONE_VIDEO_SOURCES,
  },
] as const;
