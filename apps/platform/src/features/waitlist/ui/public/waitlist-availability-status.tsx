import type { WaitlistAvailability } from "~/features/waitlist/contracts/waitlist";
import { cn } from "@eli-coach-platform/ui";

const availabilityLabels = {
  available: "Reduced-price spots available",
  limited: "Limited spots",
  closed: "Reduced-price spots closed",
} satisfies Record<WaitlistAvailability, string>;

export type WaitlistAvailabilityPresentationState = "loading" | "ready" | "unavailable";

export function WaitlistAvailabilityStatus(props: {
  announcement?: "live" | "none";
  availability: WaitlistAvailability | null;
  presentationState: WaitlistAvailabilityPresentationState;
  variant: "dark" | "light";
}) {
  if (props.presentationState === "unavailable") {
    return (
      <p
        className="text-center text-body-sm font-medium tracking-nav"
        role={props.announcement === "none" ? undefined : "alert"}
      >
        <span
          className={cn({
            "text-feedback-danger": props.variant === "light",
            "text-feedback-danger-on-inverted": props.variant === "dark",
          })}
        >
          We couldn't load waitlist availability right now. Please try again in a moment.
        </span>
      </p>
    );
  }

  if (props.availability === null) {
    return null;
  }

  return (
    <p
      className="text-center text-body-sm font-medium tracking-nav"
      role={props.announcement === "none" ? undefined : "status"}
    >
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
