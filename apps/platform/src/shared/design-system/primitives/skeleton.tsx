import * as React from "react";

import { cn } from "../lib/cn";

export function Skeleton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      data-slot="skeleton"
      className={cn(
        "block animate-pulse rounded-field bg-surface-muted",
        className,
      )}
      {...props}
    />
  );
}
