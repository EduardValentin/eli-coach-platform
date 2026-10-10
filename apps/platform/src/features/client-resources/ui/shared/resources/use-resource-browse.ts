import type {
  ResourceSortDirection,
  ResourceSortKey,
} from "@eli-coach-platform/domain/client-resources";
import { useSearchParamsWriter } from "@eli-coach-platform/ui/lib";
import { useEffect, useEffectEvent, useState } from "react";

import {
  writeResourceBrowse,
  type ResourceBrowseView,
} from "~/features/client-resources/public/resource-browse";

const SEARCH_WRITE_PAUSE_MS = 300;

type RequestedBrowse = {
  answered: ResourceBrowseView;
  view: ResourceBrowseView;
};

type ResourceSortChoice = {
  key: ResourceSortKey;
  direction: ResourceSortDirection;
};

export function useResourceBrowse(browse: ResourceBrowseView) {
  const { replaceSearchParams } = useSearchParamsWriter();
  const [typedSearch, setTypedSearch] = useState(browse.search);
  const [requested, setRequested] = useState<RequestedBrowse>({
    answered: browse,
    view: browse,
  });

  if (requested.answered !== browse) {
    setRequested({ answered: browse, view: browse });
  }

  const request = (view: ResourceBrowseView) => {
    setRequested({ answered: browse, view });
    replaceSearchParams((params) => writeResourceBrowse(params, view));
  };

  const writeTypedSearch = useEffectEvent(() => {
    request({ ...requested.view, search: typedSearch });
  });

  useEffect(() => {
    if (typedSearch.trim() === requested.view.search.trim()) return;

    const pause = window.setTimeout(writeTypedSearch, SEARCH_WRITE_PAUSE_MS);

    return () => window.clearTimeout(pause);
  }, [typedSearch, requested.view.search]);

  return {
    browse: requested.view,
    search: { typed: typedSearch, type: setTypedSearch },
    chooseTag: (tag: string | null) => request({ ...requested.view, tag }),
    chooseSort: ({ key, direction }: ResourceSortChoice) =>
      request({ ...requested.view, sort: key, direction }),
    clearFilters: () => {
      setTypedSearch("");
      request({ ...requested.view, tag: null, search: "" });
    },
  };
}
