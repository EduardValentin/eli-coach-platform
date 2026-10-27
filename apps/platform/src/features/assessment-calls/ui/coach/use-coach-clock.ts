import { useDisplayTimeZone } from "~/shared/design-system/lib";
import { useEffect, useState } from "react";

export type CoachClock = {
  now: Date;
  timeZone: string;
};

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
