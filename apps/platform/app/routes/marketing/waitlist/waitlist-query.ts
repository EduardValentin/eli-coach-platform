import { joinBasePath } from "@eli-coach-platform/config";
import {
  waitlistJoinResponseSchema,
  type Waitlist,
  type WaitlistJoinResponse,
} from "@eli-coach-platform/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  createWaitlistServerErrorResponse,
  resolveWaitlist,
  WAITLIST_API_PATH,
} from "./waitlist-client";

export const WAITLIST_API_URL = joinBasePath(import.meta.env.BASE_URL, WAITLIST_API_PATH);
export const WAITLIST_QUERY_KEY = ["marketing", "waitlist"] as const;

type FetchWaitlistOptions = {
  fallbackWaitlist: Waitlist;
  signal: AbortSignal;
};

type UseWaitlistQueryOptions = {
  initialWaitlist: Waitlist;
};

type SubmitWaitlistOptions = {
  formData: FormData;
};

export function useWaitlistQuery(options: UseWaitlistQueryOptions) {
  return useQuery({
    initialData: options.initialWaitlist,
    queryFn: ({ signal }) =>
      fetchWaitlist({
        fallbackWaitlist: options.initialWaitlist,
        signal,
      }),
    queryKey: WAITLIST_QUERY_KEY,
    refetchInterval: () =>
      getMillisecondsUntilNextWaitlistAvailabilityBoundary(new Date()),
  });
}

export function useJoinWaitlistMutation() {
  return useMutation({
    mutationFn: (formData: FormData) => submitWaitlist({ formData }),
  });
}

export async function fetchWaitlist(options: FetchWaitlistOptions): Promise<Waitlist> {
  try {
    const response = await fetch(WAITLIST_API_URL, {
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

export async function submitWaitlist(
  options: SubmitWaitlistOptions,
): Promise<WaitlistJoinResponse> {
  try {
    const response = await fetch(WAITLIST_API_URL, {
      body: options.formData,
      headers: {
        Accept: "application/json",
      },
      method: "POST",
    });
    const result = waitlistJoinResponseSchema.safeParse(await response.json());

    return result.success ? result.data : createWaitlistServerErrorResponse();
  } catch {
    return createWaitlistServerErrorResponse();
  }
}

export function getMillisecondsUntilNextWaitlistAvailabilityBoundary(now: Date): number {
  const elapsedInBucket =
    (now.getUTCMinutes() % 30) * 60_000 +
    now.getUTCSeconds() * 1_000 +
    now.getUTCMilliseconds();

  return 1_800_000 - elapsedInBucket;
}
