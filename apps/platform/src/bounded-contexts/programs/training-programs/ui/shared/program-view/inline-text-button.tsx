import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { linkVariants } from "~/shared/design-system/primitives";
import { cn } from "~/shared/design-system/lib";

type InlineTextSize = "sm" | "base";
type InlineTextWeight = "regular" | "medium" | "semibold";

const SIZE_CLASS: Record<InlineTextSize, string> = {
  sm: "text-sm",
  base: "text-base",
};
const WEIGHT_CLASS: Record<InlineTextWeight, string> = {
  regular: "",
  medium: "font-medium",
  semibold: "font-semibold",
};
type InlineTextButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "type"
> & {
  size?: InlineTextSize;
  weight?: InlineTextWeight;
  children: ReactNode;
};

export const InlineTextButton = forwardRef<
  HTMLButtonElement,
  InlineTextButtonProps
>(({ size = "sm", weight = "regular", className, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "group relative hit-area inline-flex items-center gap-1 rounded-field text-left text-text-primary",
      SIZE_CLASS[size],
      WEIGHT_CLASS[weight],
      className,
    )}
    {...props}
  >
    <span
      className={cn(
        linkVariants({ variant: "underlined" }),
        "min-w-0 group-aria-expanded:decoration-current",
      )}
    >
      {children}
    </span>
  </button>
));
InlineTextButton.displayName = "InlineTextButton";
