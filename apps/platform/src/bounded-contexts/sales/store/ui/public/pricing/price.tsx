import { cn } from "~/shared/design-system/lib";
import type { ComponentPropsWithoutRef } from "react";

const PRICE_SIZES = {
  lg: "text-2xl",
  md: "text-lg",
  sm: "text-sm",
} as const;

type PriceProps = ComponentPropsWithoutRef<"p"> & {
  size: keyof typeof PRICE_SIZES;
};

export function Price({ className, size, ...props }: PriceProps) {
  return (
    <p
      className={cn(
        "font-semibold tabular-nums tracking-tight text-copy-muted",
        PRICE_SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
