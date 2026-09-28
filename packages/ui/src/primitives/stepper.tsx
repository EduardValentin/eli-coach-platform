import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../lib/cn";

type StepperProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  current: number;
  status?: ReactNode;
  total: number;
};

export function Stepper({
  className,
  current,
  status,
  total,
  ...props
}: StepperProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="flex items-end justify-between gap-4">
        <p className="shrink-0 text-caption font-semibold uppercase tracking-widest text-text-secondary">
          Step {current} of {total}
        </p>
        <div className="min-w-0 text-right">{status}</div>
      </div>
      <div aria-hidden="true" className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => index + 1).map((step) => (
          <span
            className={cn("h-1.5 flex-1 rounded-full transition-colors", {
              "bg-primary/40": step < current,
              "bg-primary": step === current,
              "bg-surface-muted": step > current,
            })}
            key={step}
          />
        ))}
      </div>
    </div>
  );
}
