import { useSearchParamsWriter } from "@eli-coach-platform/ui/lib";
import { useLocation } from "react-router";

import {
  defaultDirectionFor,
  parsePageParam,
  parseSortDirectionParam,
  toSortKey,
  toCallStatus,
  DEFAULT_CALL_STATUS,
  DEFAULT_SORT_KEY,
  DIRECTION_PARAM,
  FIRST_PAGE,
  PAGE_PARAM,
  QUERY_PARAM,
  SORT_PARAM,
  STATUS_PARAM,
  type CallSort,
  type CoachCallStatus,
  type SortKey,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";

export type CallListingParams = {
  changeQuery: (value: string) => void;
  chooseSortKey: (key: SortKey) => void;
  chooseStatus: (value: string) => void;
  page: number;
  pathForPage: (page: number) => string;
  query: string;
  sort: CallSort;
  status: CoachCallStatus;
  toggleSortDirection: () => void;
};

export function useCallListingParams(): CallListingParams {
  const { pathname } = useLocation();
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();
  const sortKey = toSortKey(searchParams.get(SORT_PARAM));
  const sort: CallSort = {
    direction: parseSortDirectionParam(
      searchParams.get(DIRECTION_PARAM),
      sortKey,
    ),
    key: sortKey,
  };

  const chooseStatus = (value: string) => {
    const chosen = toCallStatus(value);

    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);
      setParamUnlessDefault(params, STATUS_PARAM, {
        defaultValue: DEFAULT_CALL_STATUS,
        value: chosen,
      });
    });
  };

  const changeQuery = (value: string) => {
    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);
      setParamUnlessDefault(params, QUERY_PARAM, { defaultValue: "", value });
    });
  };

  const chooseSortKey = (key: SortKey) => {
    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);
      params.delete(DIRECTION_PARAM);
      setParamUnlessDefault(params, SORT_PARAM, {
        defaultValue: DEFAULT_SORT_KEY,
        value: key,
      });
    });
  };

  const toggleSortDirection = () => {
    const reversed = sort.direction === "asc" ? "desc" : "asc";

    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);
      setParamUnlessDefault(params, DIRECTION_PARAM, {
        defaultValue: defaultDirectionFor(sort.key),
        value: reversed,
      });
    });
  };

  const pathForPage = (chosen: number) => {
    const params = new URLSearchParams(searchParams);

    if (chosen === FIRST_PAGE) {
      params.delete(PAGE_PARAM);
    } else {
      params.set(PAGE_PARAM, String(chosen));
    }

    const search = params.toString();

    return search.length > 0 ? `${pathname}?${search}` : pathname;
  };

  return {
    changeQuery,
    chooseSortKey,
    chooseStatus,
    page: parsePageParam(searchParams.get(PAGE_PARAM)),
    pathForPage,
    query: searchParams.get(QUERY_PARAM) ?? "",
    sort,
    status: toCallStatus(searchParams.get(STATUS_PARAM)),
    toggleSortDirection,
  };
}

type ParamChoice = { defaultValue: string; value: string };

function setParamUnlessDefault(
  params: URLSearchParams,
  name: string,
  choice: ParamChoice,
): void {
  if (choice.value === choice.defaultValue) {
    params.delete(name);
    return;
  }

  params.set(name, choice.value);
}
