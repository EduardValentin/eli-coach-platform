import { joinBasePath } from "~/shared/http/base-path";
import { useEffect, useState } from "react";
import { STORE_API_PATHS } from "~/bounded-contexts/sales/store/public/paths";

export const DOWNLOAD_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  STORE_API_PATHS.downloads,
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
