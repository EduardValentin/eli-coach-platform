import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type SkeletonProps = Omit<ComponentPropsWithoutRef<"div">, "aria-hidden">;

// Stands in for content that has not arrived. It is decorative — the surface
// showing it says what is happening in a live region — so it is hidden from
// assistive technology, and it holds still for a visitor who asked for less
// motion rather than pulsing at them.
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    // The props spread comes first: the attributes below are the primitive's
    // contract, not defaults a caller may drop.
    <div
      {...props}
      aria-hidden="true"
      className={cn(
        "rounded-placeholder bg-surface-placeholder motion-safe:animate-pulse",
        className,
      )}
      data-skeleton=""
    />
  );
}
