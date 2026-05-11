import { cn } from "@eli-coach-platform/ui";
import type { ComponentPropsWithoutRef } from "react";

type SectionEyebrowProps = ComponentPropsWithoutRef<"p">;

export function SectionEyebrow({ className, ...props }: SectionEyebrowProps) {
  return (
    <p
      className={cn(
        "mb-4 text-label font-semibold uppercase text-brand-primary",
        className,
      )}
      {...props}
    />
  );
}
