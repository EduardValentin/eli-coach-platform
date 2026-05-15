import {
  waitlistJoinResponseSchema,
  type Waitlist,
  type WaitlistJoinResponse,
} from "@eli-coach-platform/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createWaitlistServerErrorResponse, resolveWaitlist } from "./waitlist-client";

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

type SubmitWaitlistOptions = {
  formData: FormData;
  waitlistApiUrl: string;
};

type UseJoinWaitlistMutationOptions = {
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

export function useJoinWaitlistMutation(options: UseJoinWaitlistMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      submitWaitlist({
        formData,
        waitlistApiUrl: options.waitlistApiUrl,
      }),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({
          exact: true,
          queryKey: WAITLIST_QUERY_KEY,
        });
      }
    },
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

export async function submitWaitlist(
  options: SubmitWaitlistOptions,
): Promise<WaitlistJoinResponse> {
  try {
    const response = await fetch(options.waitlistApiUrl, {
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
