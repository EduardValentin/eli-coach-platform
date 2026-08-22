import { joinBasePath } from "@eli-coach-platform/config";
import { useQuery } from "@tanstack/react-query";

import {
  publicSessionSchema,
  type PublicSession,
} from "~/features/accounts/contracts/session";

const SESSION_API_PATH = "/api/session";
export const SESSION_API_URL = joinBasePath(import.meta.env.BASE_URL, SESSION_API_PATH);
export const SESSION_QUERY_KEY = ["public", "session"] as const;

export function useSessionQuery() {
  return useQuery({
    queryFn: ({ signal }) => fetchSession(signal),
    queryKey: SESSION_QUERY_KEY,
    staleTime: 30_000,
  });
}

/**
 * A failed lookup is indistinguishable from being signed out, and the safe
 * reading of both is the same: offer sign-in rather than a portal link.
 */
export async function fetchSession(signal: AbortSignal): Promise<PublicSession> {
  try {
    const response = await fetch(SESSION_API_URL, {
      headers: { Accept: "application/json" },
      signal,
    });

    if (!response.ok) {
      return { status: "anonymous" };
    }

    const result = publicSessionSchema.safeParse(await response.json());

    return result.success ? result.data : { status: "anonymous" };
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }

    return { status: "anonymous" };
  }
}
