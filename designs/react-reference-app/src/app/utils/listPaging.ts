export type ListPage<Item> = {
  items: Item[];
  page: number;
  pageCount: number;
  firstShown: number;
  lastShown: number;
  total: number;
};

export type PaginationStep = number | 'gap';

const PAGES_AROUND_CURRENT = 1;

const PAGES_SHOWN_WITHOUT_GAPS = 7;

export function parsePage(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

export function pageOf<Item>(
  items: Item[],
  paging: { page: number; perPage: number },
): ListPage<Item> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / paging.perPage));
  const page = Math.min(paging.page, pageCount);
  const start = (page - 1) * paging.perPage;
  const shown = items.slice(start, start + paging.perPage);

  return {
    items: shown,
    page,
    pageCount,
    firstShown: total === 0 ? 0 : start + 1,
    lastShown: start + shown.length,
    total,
  };
}

export function paginationSteps(
  page: number,
  pageCount: number,
): PaginationStep[] {
  if (pageCount <= PAGES_SHOWN_WITHOUT_GAPS) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const shown = new Set([1, pageCount]);
  for (
    let around = page - PAGES_AROUND_CURRENT;
    around <= page + PAGES_AROUND_CURRENT;
    around += 1
  ) {
    if (around >= 1 && around <= pageCount) shown.add(around);
  }

  const steps: PaginationStep[] = [];
  let previous = 0;
  for (const number of [...shown].sort((one, other) => one - other)) {
    if (previous && number - previous > 1) steps.push('gap');
    steps.push(number);
    previous = number;
  }

  return steps;
}
