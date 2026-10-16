import {
  paginationSteps,
  type ListPage,
  type PaginationStep,
} from "../lib/list-paging";
import {
  Pagination,
  PaginationEllipsis,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from "../primitives/pagination";

type PathForPage = (page: number) => string;

export function ListPager<Item>({
  pathForPage,
  view,
}: {
  pathForPage: PathForPage;
  view: ListPage<Item>;
}) {
  return (
    <div
      className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      data-parity-root="ListPager"
    >
      <p className="text-xs text-text-muted">
        Showing {view.firstShown}–{view.lastShown} of {view.total}
      </p>

      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationList>
          <PaginationPrevious
            to={view.page > 1 ? pathForPage(view.page - 1) : null}
          />

          {paginationSteps(view.page, view.pageCount).map((step, index) => (
            <PageStep
              currentPage={view.page}
              key={step === "gap" ? `gap-${index}` : step}
              pathForPage={pathForPage}
              step={step}
            />
          ))}

          <PaginationNext
            to={view.page < view.pageCount ? pathForPage(view.page + 1) : null}
          />
        </PaginationList>
      </Pagination>
    </div>
  );
}

function PageStep(props: {
  currentPage: number;
  pathForPage: PathForPage;
  step: PaginationStep;
}) {
  const { currentPage, pathForPage, step } = props;

  if (step === "gap") {
    return <PaginationEllipsis />;
  }

  return (
    <PaginationPage
      page={step}
      status={step === currentPage ? "current" : "other"}
      to={pathForPage(step)}
    />
  );
}
