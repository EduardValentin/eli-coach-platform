import { useCallback, useEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router";

export type SearchParamsWriter = {
  searchParams: URLSearchParams;
  writeSearchParams: (reviseParams: (params: URLSearchParams) => void) => void;
};

/**
 * Writes page state into the URL from a control, and reads back what is there.
 *
 * A control that navigates on every choice has two hazards this handles.
 * `setSearchParams` resolves even its callback form against the parameters of
 * the render that called it, so a choice made before the previous one has
 * rendered would be built on a stale URL and drop it; the last requested search
 * is remembered until the router commits, and revisions build on that. And a
 * choice that changes nothing must not push a history entry, or the visitor
 * presses Back through URLs that all look the same.
 *
 * The pending search is dropped on the location key rather than on the search
 * itself, because an interrupted navigation can settle on the search it started
 * from — leaving a pending value answering for a URL nobody reached, and
 * swallowing every later attempt to make that same choice.
 */
export function useSearchParamsWriter(): SearchParamsWriter {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const pendingSearch = useRef<string | null>(null);

  useEffect(() => {
    pendingSearch.current = null;
  }, [location.key]);

  const writeSearchParams = useCallback(
    (reviseParams: (params: URLSearchParams) => void) => {
      const currentSearch = pendingSearch.current ?? searchParams.toString();
      const nextParams = new URLSearchParams(currentSearch);

      reviseParams(nextParams);

      if (nextParams.toString() === currentSearch) {
        return;
      }

      pendingSearch.current = nextParams.toString();
      setSearchParams(nextParams, { preventScrollReset: true });
    },
    [searchParams, setSearchParams],
  );

  return { searchParams, writeSearchParams };
}
