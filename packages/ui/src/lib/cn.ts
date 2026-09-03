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
            "count-badge",
            "tag",
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
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
