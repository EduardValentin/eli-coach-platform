import type { WaitlistPresentation } from "~/features/waitlist/ui/shared/waitlist-presentation";
import { cn } from "@eli-coach-platform/ui/lib";

export function WaitlistAvailabilityStatus(props: {
  announcement?: "live" | "none";
  status: WaitlistPresentation["availabilityStatus"];
  variant: "dark" | "light";
}) {
  if (props.status === null) {
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
          We couldn't load waitlist availability right now. Please try again in
          a moment.
        </span>
      </p>
    );
  }

  return (
    <p
      className="text-center text-body-sm font-medium tracking-nav"
      role={props.announcement === "none" ? undefined : "status"}
    >
      <span
        className={cn({
          "text-feedback-danger": props.status.tone === "closed",
          "text-text-inverted/70":
            props.variant === "dark" && props.status.tone !== "closed",
          "text-text-secondary":
            props.variant === "light" && props.status.tone !== "closed",
        })}
      >
        {props.status.label}
      </span>
    </p>
  );
}
