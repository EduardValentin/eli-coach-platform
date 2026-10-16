export type ListPage<Item> = {
  firstShown: number;
  items: Item[];
  lastShown: number;
  page: number;
  pageCount: number;
  total: number;
};

export type PaginationStep = number | "gap";

export const FIRST_PAGE = 1;
const PAGES_AROUND_CURRENT = 1;
const PAGES_SHOWN_WITHOUT_GAPS = 7;

export function parsePage(raw: string | null): number {
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < FIRST_PAGE) {
    return FIRST_PAGE;
  }

  return parsed;
}

export function pageOf<Item>(
  items: readonly Item[],
  paging: { page: number; perPage: number },
): ListPage<Item> {
  const total = items.length;
  const pageCount = Math.max(FIRST_PAGE, Math.ceil(total / paging.perPage));
  const page = Math.min(paging.page, pageCount);
  const start = (page - 1) * paging.perPage;
  const shown = items.slice(start, start + paging.perPage);

  return {
    firstShown: total === 0 ? 0 : start + 1,
    items: shown,
    lastShown: start + shown.length,
    page,
    pageCount,
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

  const shown = new Set([FIRST_PAGE, pageCount]);

  for (
    let around = page - PAGES_AROUND_CURRENT;
    around <= page + PAGES_AROUND_CURRENT;
    around += 1
  ) {
    if (around < FIRST_PAGE || around > pageCount) {
      continue;
    }

    shown.add(around);
  }

  return withGaps([...shown].sort((one, other) => one - other));
}

function withGaps(pages: number[]): PaginationStep[] {
  const steps: PaginationStep[] = [];
  let previous = 0;

  for (const page of pages) {
    if (previous && page - previous > 1) {
      steps.push("gap");
    }

    steps.push(page);
    previous = page;
  }

  return steps;
}
