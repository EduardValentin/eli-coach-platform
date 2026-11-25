import { ChevronDown, Undo2 } from "lucide-react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { linkVariants } from "~/shared/design-system/primitives";
import { cn } from "~/shared/design-system/lib";

type InlineTextSize = "sm" | "base";
type InlineTextWeight = "regular" | "medium" | "semibold";
type InlineTextLeading = "none" | "return";
type InlineTextTrailing = "none" | "disclosure";

const SIZE_CLASS: Record<InlineTextSize, string> = {
  sm: "text-sm",
  base: "text-base",
};
const WEIGHT_CLASS: Record<InlineTextWeight, string> = {
  regular: "",
  medium: "font-medium",
  semibold: "font-semibold",
};
const GLYPH_CLASS = "size-4 shrink-0 text-text-secondary";

function Leading({ leading }: { leading: InlineTextLeading }) {
  return leading === "return" ? (
    <Undo2 aria-hidden="true" className={GLYPH_CLASS} />
  ) : null;
}

function Trailing({ trailing }: { trailing: InlineTextTrailing }) {
  if (trailing === "none") return null;

  return (
    <ChevronDown
      aria-hidden="true"
      className={cn(
        GLYPH_CLASS,
        "transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none",
      )}
    />
  );
}

type InlineTextButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "type"
> & {
  size?: InlineTextSize;
  weight?: InlineTextWeight;
  leading?: InlineTextLeading;
  trailing?: InlineTextTrailing;
  children: ReactNode;
};

export const InlineTextButton = forwardRef<
  HTMLButtonElement,
  InlineTextButtonProps
>(
  (
    {
      size = "sm",
      weight = "regular",
      leading = "none",
      trailing = "none",
      className,
      children,
      ...props
    },
    ref,
  ) => (
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
      <Leading leading={leading} />
      <span
        className={cn(
          linkVariants({ variant: "underlined" }),
          "min-w-0 group-aria-expanded:decoration-current",
        )}
      >
        {children}
      </span>
      <Trailing trailing={trailing} />
    </button>
  ),
);
InlineTextButton.displayName = "InlineTextButton";
