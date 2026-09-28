import { useSearchParamsWriter } from "@eli-coach-platform/ui/lib";

import {
  ALL_STATUSES_OPTION,
  DEFAULT_ROSTER_SORT_KEY,
  defaultRosterSortDirectionFor,
  parseRosterParams,
  ROSTER_PARAMS,
  toRosterStatusOption,
  type RosterParams,
  type RosterSort,
  type RosterSortKey,
} from "~/features/coaching-sales/contracts/coach-clients";

export type RosterParamsWriter = RosterParams & {
  changeQuery: (value: string) => void;
  chooseSort: (key: RosterSortKey) => void;
  chooseStatus: (value: string) => void;
  clearFilters: () => void;
};

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

function nextSort(current: RosterSort, key: RosterSortKey): RosterSort {
  if (key !== current.key) {
    return { direction: defaultRosterSortDirectionFor(key), key };
  }

  return { direction: current.direction === "asc" ? "desc" : "asc", key };
}

export function useRosterParams(): RosterParamsWriter {
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();
  const rosterParams = parseRosterParams(searchParams);

  const chooseStatus = (value: string) => {
    replaceSearchParams((params) => {
      setParamUnlessDefault(params, ROSTER_PARAMS.status, {
        defaultValue: ALL_STATUSES_OPTION,
        value: toRosterStatusOption(value),
      });
    });
  };

  const changeQuery = (value: string) => {
    replaceSearchParams((params) => {
      setParamUnlessDefault(params, ROSTER_PARAMS.query, {
        defaultValue: "",
        value,
      });
    });
  };

  const chooseSort = (key: RosterSortKey) => {
    const chosen = nextSort(rosterParams.sort, key);

    replaceSearchParams((params) => {
      setParamUnlessDefault(params, ROSTER_PARAMS.sort, {
        defaultValue: DEFAULT_ROSTER_SORT_KEY,
        value: chosen.key,
      });
      setParamUnlessDefault(params, ROSTER_PARAMS.direction, {
        defaultValue: defaultRosterSortDirectionFor(chosen.key),
        value: chosen.direction,
      });
    });
  };

  const clearFilters = () => {
    replaceSearchParams((params) => {
      params.delete(ROSTER_PARAMS.status);
      params.delete(ROSTER_PARAMS.query);
    });
  };

  return {
    ...rosterParams,
    changeQuery,
    chooseSort,
    chooseStatus,
    clearFilters,
  };
}
