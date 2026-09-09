import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge reads an unregistered custom `text-*` token as a color and an
// unregistered custom `rounded-*` token as a group of its own, so both lists
// below must name every such token in styles.css; cn.test.ts fails by name.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "chip-label",
            "count-badge",
            "label",
            "body-sm",
            "body-base",
            "body-lg",
            "display-sm",
            "display-md",
            "display-lg",
            "public-my-method-axis-label",
            "public-my-method-figure-heading",
            "public-my-method-overline",
            "public-footer-cta-heading-sm",
            "public-footer-cta-heading-md",
          ],
        },
      ],
      rounded: [
        {
          rounded: [
            "control",
            "panel",
            "phone-frame",
            "pill",
            "placeholder",
            "public-footer-cta-control",
            "public-logo-mark",
            "thumbnail",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
