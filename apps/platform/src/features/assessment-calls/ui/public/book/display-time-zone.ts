import { useEffect, useState } from "react";

export function useDisplayTimeZone(coachTimeZone: string | null): string {
  const [timeZone, setTimeZone] = useState(
    () => coachTimeZone ?? resolvedTimeZone(),
  );

  useEffect(() => {
    setTimeZone(resolvedTimeZone());
  }, []);

  return timeZone;
}

function resolvedTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
