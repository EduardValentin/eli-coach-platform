import { Progress as RadixProgress } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

type ProgressProps = Omit<
  ComponentPropsWithoutRef<typeof RadixProgress.Root>,
  "children" | "value"
> & {
  value?: number;
};

export function Progress({ className, value, ...props }: ProgressProps) {
  const indeterminate = value === undefined;

  return (
    <RadixProgress.Root
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className,
      )}
      value={value}
      {...props}
    >
      <RadixProgress.Indicator
        className={cn("h-full bg-primary", {
          "w-full flex-1 transition-all": !indeterminate,
          "w-1/3 animate-progress-indeterminate motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-50":
            indeterminate,
        })}
        style={
          indeterminate
            ? undefined
            : { transform: `translateX(-${100 - value}%)` }
        }
      />
    </RadixProgress.Root>
  );
}
