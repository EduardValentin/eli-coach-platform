import { cn } from "@eli-coach-platform/ui";

type SpotCounterProps = {
  cap: number;
  spotsRemaining: number | null;
  variant: "dark" | "light";
};

export function SpotCounter(props: SpotCounterProps) {
  const { cap, spotsRemaining, variant } = props;

  if (spotsRemaining === null) {
    return null;
  }

  const filledPercentage = ((cap - spotsRemaining) / cap) * 100;
  const state = resolveCounterState({ cap, spotsRemaining });
  const label = resolveCounterLabel({ cap, spotsRemaining });

  return (
    <div
      className="mx-auto w-full max-w-sm"
      data-state={state}
    >
      <p
        className={cn("mb-2 text-center text-body-sm font-medium tracking-nav", {
          "text-feedback-danger": state === "sold-out",
          "text-text-inverted/70": variant === "dark" && state === "available",
          "text-text-secondary": variant === "light" && state === "available",
        })}
      >
        {label}
      </p>
      <div
        aria-hidden="true"
        className={cn("h-1 overflow-hidden rounded-pill", {
          "bg-surface-base/10": variant === "dark",
          "bg-border-subtle": variant === "light",
        })}
      >
        <div
          className="h-full rounded-pill bg-brand-primary transition-[width] duration-700 ease-out"
          style={{ width: `${filledPercentage}%` }}
        />
      </div>
    </div>
  );
}

function resolveCounterLabel(options: {
  cap: number;
  spotsRemaining: number;
}): string {
  if (options.spotsRemaining === 0) {
    return "All spots have been claimed";
  }

  return `${options.spotsRemaining} of ${options.cap} spots remaining`;
}

function resolveCounterState(options: { cap: number; spotsRemaining: number }): string {
  if (options.spotsRemaining === 0) {
    return "sold-out";
  }

  return "available";
}
