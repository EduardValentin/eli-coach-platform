import {
  paginationSteps,
  type CallPageView,
} from '../../utils/assessmentCallListing';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';

const INACTIVE_STEP_CLASS = 'pointer-events-none opacity-50';

export function CallListPager({
  view,
  hrefForPage,
  onPageChange,
}: {
  view: CallPageView;
  hrefForPage: (page: number) => string;
  onPageChange: (page: number) => void;
}) {
  const goTo = (page: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    onPageChange(page);
  };

  const stepToPage = (page: number) => ({
    href: hrefForPage(page),
    onClick: goTo(page),
  });

  const stepAtEnd = () => ({
    href: hrefForPage(view.page),
    'aria-disabled': true as const,
    tabIndex: -1,
    className: INACTIVE_STEP_CLASS,
    onClick: (event: React.MouseEvent) => event.preventDefault(),
  });

  return (
    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {view.firstShown}–{view.lastShown} of {view.total}
      </p>

      {view.pageCount > 1 && (
        <Pagination className="mx-0 w-auto justify-start sm:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                {...(view.page > 1 ? stepToPage(view.page - 1) : stepAtEnd())}
              />
            </PaginationItem>

            {paginationSteps(view.page, view.pageCount).map((step, index) =>
              step === 'gap' ? (
                <PaginationItem key={`gap-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={step}>
                  <PaginationLink
                    href={hrefForPage(step)}
                    isActive={step === view.page}
                    aria-label={`Go to page ${step}`}
                    onClick={goTo(step)}
                  >
                    {step}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                {...(view.page < view.pageCount
                  ? stepToPage(view.page + 1)
                  : stepAtEnd())}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
