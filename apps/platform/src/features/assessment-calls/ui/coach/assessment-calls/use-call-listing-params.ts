import { useSearchParamsWriter } from "@eli-coach-platform/ui/lib";
import { useLocation } from "react-router";

import { COACH_CALLS_PAGE_PARAM } from "~/features/assessment-calls/contracts/paths";

import {
  defaultDirectionFor,
  parsePageParam,
  parseSortDirectionParam,
  toCallWhen,
  toSortKey,
  DEFAULT_CALL_WHEN,
  DEFAULT_SORT_KEY,
  DIRECTION_PARAM,
  FILTER_PARAMS,
  FIRST_PAGE,
  QUERY_PARAM,
  SORT_PARAM,
  WHEN_PARAM,
  type CallSort,
  type CoachCallWhen,
  type SortKey,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";

export type CallListingParams = {
  changeQuery: (value: string) => void;
  chooseSortKey: (key: SortKey) => void;
  chooseWhen: (value: string) => void;
  clearFilters: (extraParams: readonly string[]) => void;
  page: number;
  pathForPage: (page: number) => string;
  query: string;
  sort: CallSort;
  toggleSortDirection: () => void;
  when: CoachCallWhen;
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

  const chooseWhen = (value: string) => {
    const chosen = toCallWhen(value);

    replaceSearchParams((params) => {
      params.delete(COACH_CALLS_PAGE_PARAM);
      setParamUnlessDefault(params, WHEN_PARAM, {
        defaultValue: DEFAULT_CALL_WHEN,
        value: chosen,
      });
    });
  };

  const clearFilters = (extraParams: readonly string[]) => {
    replaceSearchParams((params) => {
      for (const param of [...FILTER_PARAMS, ...extraParams]) {
        params.delete(param);
      }
    });
  };

  const changeQuery = (value: string) => {
    replaceSearchParams((params) => {
      params.delete(COACH_CALLS_PAGE_PARAM);
      setParamUnlessDefault(params, QUERY_PARAM, { defaultValue: "", value });
    });
  };

  const chooseSortKey = (key: SortKey) => {
    replaceSearchParams((params) => {
      params.delete(COACH_CALLS_PAGE_PARAM);
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
      params.delete(COACH_CALLS_PAGE_PARAM);
      setParamUnlessDefault(params, DIRECTION_PARAM, {
        defaultValue: defaultDirectionFor(sort.key),
        value: reversed,
      });
    });
  };

  const pathForPage = (chosen: number) => {
    const params = new URLSearchParams(searchParams);

    if (chosen === FIRST_PAGE) {
      params.delete(COACH_CALLS_PAGE_PARAM);
    } else {
      params.set(COACH_CALLS_PAGE_PARAM, String(chosen));
    }

    const search = params.toString();

    return search.length > 0 ? `${pathname}?${search}` : pathname;
  };

  return {
    changeQuery,
    chooseSortKey,
    chooseWhen,
    clearFilters,
    page: parsePageParam(searchParams.get(COACH_CALLS_PAGE_PARAM)),
    pathForPage,
    query: searchParams.get(QUERY_PARAM) ?? "",
    sort,
    toggleSortDirection,
    when: toCallWhen(searchParams.get(WHEN_PARAM)),
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
