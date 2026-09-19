import { useDisplayTimeZone } from "@eli-coach-platform/ui/lib";
import { useEffect, useState } from "react";

export type CoachClock = {
  now: Date;
  timeZone: string;
};

/**
 * The server paints the first render from its own clock in the coach's zone,
 * so the HTML a reader receives is already right for her; the browser takes
 * over on mount with its own clock and zone. Nothing ticks afterwards: a call
 * crosses from upcoming to past on the next render, not on a timer.
 */
export function useCoachClock(
  serverNow: string,
  coachTimeZone: string,
): CoachClock {
  const timeZone = useDisplayTimeZone(coachTimeZone);
  const [now, setNow] = useState(() => new Date(serverNow));

  useEffect(() => {
    setNow(new Date());
  }, [serverNow]);

  return { now, timeZone };
}
