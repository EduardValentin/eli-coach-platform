import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Custom @theme `text-*` font-size tokens (styles.css) must be registered under
// the `font-size` group, or tailwind-merge treats them as `text-{color}` and
// silently drops the size when a color class shares the same element.
// Keep this list in sync with styles.css: cn.test.ts fails by name if a
// token is added there without being registered here.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
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
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
