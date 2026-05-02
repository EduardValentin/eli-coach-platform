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
  const isUrgent = spotsRemaining > 0 && spotsRemaining <= Math.ceil(cap * 0.2);
  const isSoldOut = spotsRemaining === 0;
  const label = resolveCounterLabel({
    cap,
    isSoldOut,
    isUrgent,
    spotsRemaining,
  });

  return (
    <div
      className="mx-auto w-full max-w-sm"
      data-state={resolveCounterState({ isSoldOut, isUrgent })}
    >
      <p
        className={cn("mb-2 text-center text-body-sm font-medium tracking-wide", {
          "text-feedback-danger": isUrgent || isSoldOut,
          "text-text-inverted/80": variant === "dark" && !isUrgent && !isSoldOut,
          "text-text-secondary": variant === "light" && !isUrgent && !isSoldOut,
        })}
      >
        {label}
      </p>
      <div
        aria-hidden="true"
        className={cn("h-1 overflow-hidden rounded-pill", {
          "bg-surface-base/15": variant === "dark",
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
  isSoldOut: boolean;
  isUrgent: boolean;
  spotsRemaining: number;
}): string {
  if (options.isSoldOut) {
    return "All spots have been claimed";
  }

  if (options.isUrgent) {
    return `Only ${options.spotsRemaining} spots left`;
  }

  return `${options.spotsRemaining} of ${options.cap} spots remaining`;
}

function resolveCounterState(options: { isSoldOut: boolean; isUrgent: boolean }): string {
  if (options.isSoldOut) {
    return "sold-out";
  }

  return options.isUrgent ? "urgent" : "available";
}
