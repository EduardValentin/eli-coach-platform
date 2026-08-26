import { joinBasePath } from "@eli-coach-platform/config";
import { useQuery } from "@tanstack/react-query";

import {
  publicSessionSchema,
  type PublicSession,
} from "~/features/accounts/contracts/session";

const SESSION_API_PATH = "/api/session";
export const SESSION_API_URL = joinBasePath(import.meta.env.BASE_URL, SESSION_API_PATH);
export const SESSION_QUERY_KEY = ["public", "session"] as const;

/**
 * The role behind a session lives in this application's database rather than in
 * the identity provider, so it is read here even though the signed-in state
 * itself comes from the browser identity client.
 */
export function useSessionQuery(options: { enabled: boolean }) {
  return useQuery({
    enabled: options.enabled,
    queryFn: ({ signal }) => fetchSession(signal),
    queryKey: SESSION_QUERY_KEY,
    staleTime: 30_000,
  });
}

export async function fetchSession(signal: AbortSignal): Promise<PublicSession> {
  const response = await fetch(SESSION_API_URL, {
    headers: { Accept: "application/json" },
    signal,
  });
  const session = publicSessionSchema.safeParse(await readJsonSafely(response));

  if (!response.ok || !session.success) {
    throw new Error("Session is unavailable.");
  }

  return session.data;
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
