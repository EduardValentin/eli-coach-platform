import type { WelcomePage } from "~/features/coaching-sales/public/client-journey";

export const WELCOME_OPENING = "I'm really glad you're here.";

export const WELCOME_TOGETHER =
  "From now on, we work together — with a plan built around your goals and what your body actually needs.";

export const WELCOME_FORM_INTRO: Record<WelcomePage["wording"], string> = {
  "five-part":
    "But first, I need to get to know you. Your next step is a short form in five parts — it takes about 15 minutes — covering your goals, your training experience, your health, your cycle, your nutrition and your measurements.",
  "four-part":
    "But first, I need to get to know you. Your next step is a short form in four parts — it takes about 15 minutes — covering your goals, your training experience, your health, your nutrition and your measurements.",
};

export const WELCOME_PACE =
  "You can pause and come back anytime — your answers are saved as you go. Try not to leave it too long: I can only start building your program once I have your answers.";

export const WELCOME_CLOSING =
  "Once you've completed it, I'll go through everything and build your program. You'll find it right here in your account.";

export const WELCOME_START_LABEL = "Let's get started";

export function welcomeHeading(firstName: string): string {
  return `Welcome to Evoa Fitness, ${firstName}`;
}
