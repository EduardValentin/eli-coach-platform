import { joinBasePath } from "@eli-coach-platform/config";
import { useQuery } from "@tanstack/react-query";

import {
  publicIdentityConfigSchema,
  type PublicIdentityConfig,
} from "~/features/accounts/contracts/identity-config";

export const IDENTITY_CONFIG_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  "/api/auth/config",
);
export const IDENTITY_CONFIG_QUERY_KEY = ["public", "identity-config"] as const;

export function useIdentityConfigQuery() {
  return useQuery({
    queryFn: ({ signal }) => fetchIdentityConfig(signal),
    queryKey: IDENTITY_CONFIG_QUERY_KEY,
    staleTime: Infinity,
  });
}

export async function fetchIdentityConfig(
  signal: AbortSignal,
): Promise<PublicIdentityConfig> {
  const response = await fetch(IDENTITY_CONFIG_API_URL, {
    headers: { Accept: "application/json" },
    signal,
  });
  const config = publicIdentityConfigSchema.safeParse(
    await readJsonSafely(response),
  );

  if (!response.ok || !config.success) {
    throw new Error("Identity configuration is unavailable.");
  }

  return config.data;
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
