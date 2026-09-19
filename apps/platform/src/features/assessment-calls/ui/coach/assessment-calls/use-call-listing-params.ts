import { useSearchParamsWriter } from "@eli-coach-platform/ui/lib";
import { useLocation } from "react-router";

import {
  parsePageParam,
  parseStatusParam,
  PAGE_PARAM,
  QUERY_PARAM,
  STATUS_PARAM,
  type CoachCallStatus,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";

const DEFAULT_STATUS: CoachCallStatus = "upcoming";
const FIRST_PAGE = 1;

export type CallListingParams = {
  changeQuery: (value: string) => void;
  chooseStatus: (value: string) => void;
  page: number;
  pathForPage: (page: number) => string;
  query: string;
  status: CoachCallStatus;
};

export function useCallListingParams(): CallListingParams {
  const { pathname } = useLocation();
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();

  const chooseStatus = (value: string) => {
    const chosen = parseStatusParam(value);

    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);

      if (chosen === DEFAULT_STATUS) {
        params.delete(STATUS_PARAM);
        return;
      }

      params.set(STATUS_PARAM, chosen);
    });
  };

  const changeQuery = (value: string) => {
    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);

      if (value.length === 0) {
        params.delete(QUERY_PARAM);
        return;
      }

      params.set(QUERY_PARAM, value);
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
    chooseStatus,
    page: parsePageParam(searchParams.get(PAGE_PARAM)),
    pathForPage,
    query: searchParams.get(QUERY_PARAM) ?? "",
    status: parseStatusParam(searchParams.get(STATUS_PARAM)),
  };
}
