import { useLocation, useSearchParams } from 'react-router';
import { parsePage } from '../utils/listPaging';

const PAGE_PARAM = 'page';

type ParamValue = string | readonly string[] | null;

function isCleared(value: ParamValue): value is null {
  return value === null || value.length === 0;
}

export function useListingSearchParams() {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const read = (name: string) => searchParams.get(name);

  const readList = (name: string): string[] =>
    (searchParams.get(name) ?? '').split(',').filter((value) => value.length > 0);

  const write = (values: Record<string, ParamValue>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([name, value]) => {
      if (isCleared(value)) next.delete(name);
      else next.set(name, typeof value === 'string' ? value : value.join(','));
    });
    next.delete(PAGE_PARAM);
    setSearchParams(next, { replace: true });
  };

  const pathForPage = (chosen: number) => {
    const params = new URLSearchParams(searchParams);
    if (chosen === 1) params.delete(PAGE_PARAM);
    else params.set(PAGE_PARAM, String(chosen));
    const query = params.toString();
    return query.length > 0 ? `${pathname}?${query}` : pathname;
  };

  return {
    read,
    readList,
    write,
    page: parsePage(searchParams.get(PAGE_PARAM)),
    pathForPage,
  };
}
