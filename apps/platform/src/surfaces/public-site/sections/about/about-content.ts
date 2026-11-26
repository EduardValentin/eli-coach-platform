import { ELI_PORTRAIT_PATHS } from "~/shared/brand";

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

function aboutMediaPath(fileName: string) {
  return `media/about/${fileName}`;
}

function storyMedia(reelName: string) {
  return {
    posterPath: aboutMediaPath(`story-${reelName}-poster.webp`),
    // A browser plays the first source it supports, so AV1 comes first.
    videoSources: [
      {
        path: aboutMediaPath(`story-${reelName}.av1.mp4`),
        type: 'video/mp4; codecs="av01.0.05M.08"',
      },
      { path: aboutMediaPath(`story-${reelName}.h264.mp4`), type: "video/mp4" },
    ],
  };
}

export const ABOUT_STORIES = [
  { alt: "Story 1 of 3", ...storyMedia("lifestyle") },
  { alt: "Story 2 of 3", ...storyMedia("mobility") },
  { alt: "Story 3 of 3", ...storyMedia("gym") },
] as const;
