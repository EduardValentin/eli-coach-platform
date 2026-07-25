import type { WaitlistAvailability } from "@eli-coach-platform/contracts";
import { cn } from "@eli-coach-platform/ui";

const availabilityLabels = {
  available: "Reduced-price spots available",
  limited: "Limited spots",
  closed: "Reduced-price spots closed",
} satisfies Record<WaitlistAvailability, string>;

export function WaitlistAvailabilityStatus(props: {
  availability: WaitlistAvailability | null;
  variant: "dark" | "light";
}) {
  if (props.availability === null) {
    return null;
  }

  return (
    <p className="text-center text-body-sm font-medium tracking-nav" role="status">
      <span
        className={cn({
          "text-feedback-danger": props.availability === "closed",
          "text-text-inverted/70":
            props.variant === "dark" && props.availability !== "closed",
          "text-text-secondary":
            props.variant === "light" && props.availability !== "closed",
        })}
      >
        {availabilityLabels[props.availability]}
      </span>
    </p>
  );
}
