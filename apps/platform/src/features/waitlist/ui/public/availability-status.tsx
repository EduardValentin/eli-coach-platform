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
        className="text-center text-sm font-medium tracking-wide"
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

  const isClosed = props.status.tone === "closed";

  return (
    <p
      className={cn("text-center text-sm font-medium tracking-wide", {
        "text-feedback-danger": isClosed && props.variant === "light",
        "text-feedback-danger-on-inverted":
          isClosed && props.variant === "dark",
        "text-text-inverted/70": !isClosed && props.variant === "dark",
        "text-copy-muted": !isClosed && props.variant === "light",
      })}
      role={props.announcement === "none" ? undefined : "status"}
    >
      {props.status.label}
    </p>
  );
}
