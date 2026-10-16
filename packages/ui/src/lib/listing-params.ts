import { FIRST_PAGE } from "./list-paging";

type ParamChoice = { defaultValue: string; value: string };

type ListingAddress = {
  pageParam: string;
  pathname: string;
  searchParams: URLSearchParams;
};

export function haveOnlyListingParamsChanged(
  currentUrl: URL,
  nextUrl: URL,
  params: readonly string[],
): boolean {
  if (currentUrl.href === nextUrl.href) {
    return false;
  }

  return (
    currentUrl.pathname === nextUrl.pathname &&
    withoutParams(currentUrl, params) === withoutParams(nextUrl, params)
  );
}

export function setParamUnlessDefault(
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

export function setParamOrDelete(
  params: URLSearchParams,
  name: string,
  value: string | null,
): void {
  if (value === null) {
    params.delete(name);
    return;
  }

  params.set(name, value);
}

export function pathForPageOf(address: ListingAddress, page: number): string {
  const params = new URLSearchParams(address.searchParams);

  if (page === FIRST_PAGE) {
    params.delete(address.pageParam);
  } else {
    params.set(address.pageParam, String(page));
  }

  const search = params.toString();

  return search.length > 0 ? `${address.pathname}?${search}` : address.pathname;
}

function withoutParams(url: URL, params: readonly string[]): string {
  const searchParams = new URLSearchParams(url.search);

  for (const param of params) {
    searchParams.delete(param);
  }

  return searchParams.toString();
}
