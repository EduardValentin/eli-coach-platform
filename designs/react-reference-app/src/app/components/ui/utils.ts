import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Custom @theme `text-*` font-size tokens (theme.css) must be registered under
// the `font-size` group, or tailwind-merge treats them as `text-{color}` and
// silently drops the size when a color class shares the same element.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "public-my-method-axis-label",
            "public-my-method-figure-heading",
            "public-my-method-overline",
            "public-footer-cta-heading-sm",
            "public-footer-cta-heading-md",
            "phone-caption",
            "phone-action",
            "phone-body",
            "phone-title",
            "phone-value",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
