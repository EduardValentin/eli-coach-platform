import {
  parsePage,
  parseSort,
  pathForPageOf,
  setParamOrDelete,
  setParamUnlessDefault,
  sortParams,
  useSearchParamsWriter,
  type SortChoice,
} from "~/shared/design-system/lib";
import { useLocation } from "react-router";

import { COACH_CALLS_PAGE_PARAM } from "~/features/assessment-calls/public/paths";

import {
  toCallWhen,
  CALL_SORT_RULE,
  DEFAULT_CALL_WHEN,
  DIRECTION_PARAM,
  FILTER_PARAMS,
  QUERY_PARAM,
  SORT_PARAM,
  WHEN_PARAM,
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
  sort: SortChoice<SortKey>;
  toggleSortDirection: () => void;
  when: CoachCallWhen;
};

export function useCallListingParams(): CallListingParams {
  const { pathname } = useLocation();
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();
  const sort = parseSort(
    CALL_SORT_RULE,
    searchParams.get(SORT_PARAM),
    searchParams.get(DIRECTION_PARAM),
  );

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

  const replaceSort = (next: SortChoice<SortKey>) => {
    const written = sortParams(CALL_SORT_RULE, next);

    replaceSearchParams((params) => {
      params.delete(COACH_CALLS_PAGE_PARAM);
      setParamOrDelete(params, SORT_PARAM, written.sort);
      setParamOrDelete(params, DIRECTION_PARAM, written.dir);
    });
  };

  const chooseSortKey = (key: SortKey) =>
    replaceSort({ direction: CALL_SORT_RULE.defaultDirection[key], key });

  const toggleSortDirection = () =>
    replaceSort({
      direction: sort.direction === "asc" ? "desc" : "asc",
      key: sort.key,
    });

  const pathForPage = (chosen: number) =>
    pathForPageOf(
      { pageParam: COACH_CALLS_PAGE_PARAM, pathname, searchParams },
      chosen,
    );

  return {
    changeQuery,
    chooseSortKey,
    chooseWhen,
    clearFilters,
    page: parsePage(searchParams.get(COACH_CALLS_PAGE_PARAM)),
    pathForPage,
    query: searchParams.get(QUERY_PARAM) ?? "",
    sort,
    toggleSortDirection,
    when: toCallWhen(searchParams.get(WHEN_PARAM)),
  };
}
