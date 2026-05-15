import type { Waitlist } from "@eli-coach-platform/contracts";
import { useQuery } from "@tanstack/react-query";

import { resolveWaitlist } from "./waitlist-client";

export const WAITLIST_QUERY_KEY = ["marketing", "waitlist"] as const;

type FetchWaitlistOptions = {
  fallbackWaitlist: Waitlist;
  signal: AbortSignal;
  waitlistApiUrl: string;
};

type UseWaitlistQueryOptions = {
  initialWaitlist: Waitlist;
  waitlistApiUrl: string;
};

export function useWaitlistQuery(options: UseWaitlistQueryOptions) {
  return useQuery({
    initialData: options.initialWaitlist,
    queryFn: ({ signal }) =>
      fetchWaitlist({
        fallbackWaitlist: options.initialWaitlist,
        signal,
        waitlistApiUrl: options.waitlistApiUrl,
      }),
    queryKey: WAITLIST_QUERY_KEY,
  });
}

export async function fetchWaitlist(options: FetchWaitlistOptions): Promise<Waitlist> {
  try {
    const response = await fetch(options.waitlistApiUrl, {
      headers: {
        Accept: "application/json",
      },
      signal: options.signal,
    });

    if (!response.ok) {
      return options.fallbackWaitlist;
    }

    return resolveWaitlist(await response.json()) ?? options.fallbackWaitlist;
  } catch (error) {
    if (options.signal.aborted) {
      throw error;
    }

    return options.fallbackWaitlist;
  }
}
