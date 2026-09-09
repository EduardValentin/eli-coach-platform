import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type SkeletonProps = Omit<ComponentPropsWithoutRef<"div">, "aria-hidden">;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
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
