import { useSearchParamsWriter } from "@eli-coach-platform/ui/lib";
import { useLocation } from "react-router";

import {
  defaultDirectionFor,
  parseDateRangeParams,
  parsePageParam,
  parseSortDirectionParam,
  parseSortKeyParam,
  parseStatusParam,
  DEFAULT_CALL_STATUS,
  DEFAULT_SORT_KEY,
  DIRECTION_PARAM,
  FIRST_PAGE,
  FROM_PARAM,
  PAGE_PARAM,
  QUERY_PARAM,
  SORT_PARAM,
  STATUS_PARAM,
  TO_PARAM,
  type CallSort,
  type CoachCallStatus,
  type DateRange,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";

export type CallListingParams = {
  changeQuery: (value: string) => void;
  chooseRange: (range: DateRange) => void;
  chooseSortKey: (value: string) => void;
  chooseStatus: (value: string) => void;
  page: number;
  pathForPage: (page: number) => string;
  query: string;
  range: DateRange;
  sort: CallSort;
  status: CoachCallStatus;
  toggleSortDirection: () => void;
};

export function useCallListingParams(): CallListingParams {
  const { pathname } = useLocation();
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();
  const sortKey = parseSortKeyParam(searchParams.get(SORT_PARAM));
  const sort: CallSort = {
    direction: parseSortDirectionParam(
      searchParams.get(DIRECTION_PARAM),
      sortKey,
    ),
    key: sortKey,
  };

  const chooseStatus = (value: string) => {
    const chosen = parseStatusParam(value);

    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);
      writeParam(params, STATUS_PARAM, {
        unlessDefault: DEFAULT_CALL_STATUS,
        value: chosen,
      });
    });
  };

  const changeQuery = (value: string) => {
    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);
      writeParam(params, QUERY_PARAM, { unlessDefault: "", value });
    });
  };

  const chooseRange = (range: DateRange) => {
    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);
      writeParam(params, FROM_PARAM, {
        unlessDefault: null,
        value: range.from,
      });
      writeParam(params, TO_PARAM, { unlessDefault: null, value: range.to });
    });
  };

  const chooseSortKey = (value: string) => {
    const chosen = parseSortKeyParam(value);

    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);
      params.delete(DIRECTION_PARAM);
      writeParam(params, SORT_PARAM, {
        unlessDefault: DEFAULT_SORT_KEY,
        value: chosen,
      });
    });
  };

  const toggleSortDirection = () => {
    const reversed = sort.direction === "asc" ? "desc" : "asc";

    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);
      writeParam(params, DIRECTION_PARAM, {
        unlessDefault: defaultDirectionFor(sort.key),
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
    chooseRange,
    chooseSortKey,
    chooseStatus,
    page: parsePageParam(searchParams.get(PAGE_PARAM)),
    pathForPage,
    query: searchParams.get(QUERY_PARAM) ?? "",
    range: parseDateRangeParams(
      searchParams.get(FROM_PARAM),
      searchParams.get(TO_PARAM),
    ),
    sort,
    status: parseStatusParam(searchParams.get(STATUS_PARAM)),
    toggleSortDirection,
  };
}

type ParamChoice = { unlessDefault: string | null; value: string | null };

function writeParam(
  params: URLSearchParams,
  param: string,
  choice: ParamChoice,
): void {
  if (choice.value === null || choice.value === choice.unlessDefault) {
    params.delete(param);
    return;
  }

  params.set(param, choice.value);
}
