import type { ReactNode } from "react";

import { cn } from "../lib/cn";

type StepperProps = {
  className?: string;
  current: number;
  status?: ReactNode;
  total: number;
};

export function Stepper({ className, current, status, total }: StepperProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-end justify-between gap-4">
        <p className="text-caption font-semibold uppercase tracking-widest text-text-secondary">
          Step {current} of {total}
        </p>
        {status}
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
