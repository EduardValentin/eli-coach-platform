import { cn } from "~/shared/design-system/lib";
import type { ComponentPropsWithoutRef } from "react";

const FREE_TAG_SIZES = {
  default: "px-3 py-1.5 text-label",
  sm: "px-2 py-0.5 text-caption leading-4 font-semibold tracking-label",
} as const;

type FreeTagProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  size?: keyof typeof FREE_TAG_SIZES;
};

export function FreeTag({
  className,
  size = "default",
  ...props
}: FreeTagProps) {
  return (
    <span
      className={cn(
        "rounded-full bg-brand-secondary uppercase text-brand-secondary-foreground",
        FREE_TAG_SIZES[size],
        className,
      )}
      {...props}
    >
      Free
    </span>
  );
}
