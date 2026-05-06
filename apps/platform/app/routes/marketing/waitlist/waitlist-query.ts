import type { WaitlistSnapshot } from "@eli-coach-platform/contracts";
import { useQuery } from "@tanstack/react-query";

import { resolveWaitlistSnapshot } from "./waitlist-client";

export const WAITLIST_SNAPSHOT_QUERY_KEY = ["marketing", "waitlist-snapshot"] as const;

type FetchWaitlistSnapshotOptions = {
  fallbackSnapshot: WaitlistSnapshot;
  signal: AbortSignal;
  waitlistApiUrl: string;
};

type UseWaitlistSnapshotQueryOptions = {
  initialSnapshot: WaitlistSnapshot;
  waitlistApiUrl: string;
};

export function useWaitlistSnapshotQuery(options: UseWaitlistSnapshotQueryOptions) {
  return useQuery({
    initialData: options.initialSnapshot,
    queryFn: ({ signal }) =>
      fetchWaitlistSnapshot({
        fallbackSnapshot: options.initialSnapshot,
        signal,
        waitlistApiUrl: options.waitlistApiUrl,
      }),
    queryKey: WAITLIST_SNAPSHOT_QUERY_KEY,
  });
}

export async function fetchWaitlistSnapshot(
  options: FetchWaitlistSnapshotOptions,
): Promise<WaitlistSnapshot> {
  try {
    const response = await fetch(options.waitlistApiUrl, {
      headers: {
        Accept: "application/json",
      },
      signal: options.signal,
    });

    if (!response.ok) {
      return options.fallbackSnapshot;
    }

    return resolveWaitlistSnapshot(await response.json()) ?? options.fallbackSnapshot;
  } catch (error) {
    if (options.signal.aborted) {
      throw error;
    }

    return options.fallbackSnapshot;
  }
}
