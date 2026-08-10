import { joinBasePath } from "@eli-coach-platform/config";
import { useEffect, useState } from "react";

export const DOWNLOAD_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  "/api/store/downloads",
);

type DownloadLocation = Pick<Location, "hash" | "search">;

export function resolvePrivateDownloadToken(
  location: DownloadLocation,
): string {
  const unavailable =
    new URLSearchParams(location.search).get("unavailable") === "1";

  return unavailable ? "" : location.hash.slice(1).trim();
}

export function usePrivateDownloadToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const resolvedToken = resolvePrivateDownloadToken(window.location);

    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    setToken(resolvedToken);
  }, []);

  return token;
}
