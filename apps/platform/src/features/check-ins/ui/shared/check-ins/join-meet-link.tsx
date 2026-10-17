import { JoinLink } from "@eli-coach-platform/ui/appointments";
import { useEffect, useState } from "react";

import type { ListedCheckIn } from "./check-in-listing-rules";

type JoinMeetLinkProps = {
  checkIn: Pick<ListedCheckIn, "endsAt" | "joinEmphasisFrom">;
  className?: string;
  size?: "sm" | "xs";
  to: string;
  width?: "content" | "full";
};

const MINUTE_MS = 60 * 1000;

export function JoinMeetLink({
  checkIn,
  className,
  size,
  to,
  width,
}: JoinMeetLinkProps) {
  const now = useMinuteTick();
  const isJoinNear =
    now >= Date.parse(checkIn.joinEmphasisFrom) &&
    now < Date.parse(checkIn.endsAt);

  return (
    <JoinLink
      className={className}
      data-parity="join-meet"
      label="Join Meet"
      size={size}
      to={to}
      tone={isJoinNear ? "primary" : "quiet"}
      width={width}
    />
  );
}

function useMinuteTick(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), MINUTE_MS);

    return () => window.clearInterval(timer);
  }, []);

  return now;
}
