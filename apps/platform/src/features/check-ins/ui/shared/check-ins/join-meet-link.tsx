import { JoinLink } from "@eli-coach-platform/ui/appointments";
import { useEffect, useState } from "react";

import type { ListedCheckIn } from "./check-in-listing";

type JoinMeetLinkProps = {
  checkIn: Pick<ListedCheckIn, "endsAt" | "joinEmphasisFrom">;
  size?: "sm" | "xs";
  to: string;
};

const MINUTE_MS = 60 * 1000;

export function JoinMeetLink({ checkIn, size, to }: JoinMeetLinkProps) {
  const now = useMinuteTick();
  const isJoinNear =
    now >= Date.parse(checkIn.joinEmphasisFrom) &&
    now < Date.parse(checkIn.endsAt);

  return (
    <JoinLink
      data-parity="join-meet"
      label="Join Meet"
      size={size}
      to={to}
      tone={isJoinNear ? "primary" : "quiet"}
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
