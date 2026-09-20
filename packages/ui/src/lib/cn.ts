import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "micro",
        "caption",
        "label",
        "md",
        "display-sm",
        "display-md",
        "display-lg",
        "public-my-method-figure-heading",
        "public-cycle-phase",
        "phone-caption",
        "phone-title",
        "phone-value",
        "public-footer-cta-heading-sm",
        "public-footer-cta-heading-md",
      ],
      radius: [
        "checkbox",
        "tile",
        "field",
        "compact",
        "control",
        "card",
        "panel",
        "phone-frame",
      ],
      shadow: [
        "soft",
        "card",
        "action",
        "action-hover",
        "raised",
        "floating",
        "public-footer-cta-sheet",
        "phone-frame",
        "public-platform-cloud",
        "public-platform-cloud-active",
      ],
      tracking: ["label", "section-eyebrow"],
      leading: ["display-snug"],
      container: ["reading", "content", "portal", "stage"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
