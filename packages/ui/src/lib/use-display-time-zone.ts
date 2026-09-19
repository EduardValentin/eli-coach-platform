import { useEffect, useState } from "react";

export function useDisplayTimeZone(serverTimeZone: string | null): string {
  const [timeZone, setTimeZone] = useState(
    () => serverTimeZone ?? resolvedTimeZone(),
  );

  useEffect(() => {
    setTimeZone(resolvedTimeZone());
  }, []);

  return timeZone;
}

function resolvedTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
