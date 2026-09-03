import { cn } from "../lib/cn";

export type StepperProps = {
  className?: string;
  currentStep: number;
  label?: string;
  totalSteps: number;
};

/**
 * The bars are decorative: they repeat what the caption already says, so they
 * are hidden from assistive technology rather than announced twice.
 */
export function Stepper({
  className,
  currentStep,
  label = "Step",
  totalSteps,
}: StepperProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-label font-semibold uppercase tracking-widest text-text-muted">
        {label} {currentStep} of {totalSteps}
      </p>
      <div className="flex w-full items-center gap-2" aria-hidden="true">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-pill transition-colors duration-500",
              // The unfilled part is a rule the fill runs over, so it takes the
              // hairline neutral. `surface-subtle` is a page-coloured fill and
              // left the remaining steps invisible against the page behind it.
              index < currentStep ? "bg-brand-primary" : "bg-border-subtle",
            )}
          />
        ))}
      </div>
    </div>
  );
}
