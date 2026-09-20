import { Link } from 'react-router';
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

export function CallListPager({
  view,
  pathForPage,
}: {
  view: CallPageView;
  pathForPage: (page: number) => string;
}) {
  return (
    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {view.firstShown}–{view.lastShown} of {view.total}
      </p>

      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            {view.page > 1 ? (
              <PaginationPrevious asChild>
                <Link to={pathForPage(view.page - 1)} replace />
              </PaginationPrevious>
            ) : (
              <PaginationPrevious asChild>
                <button type="button" disabled />
              </PaginationPrevious>
            )}
          </PaginationItem>

          {paginationSteps(view.page, view.pageCount).map((step, index) =>
            step === 'gap' ? (
              <PaginationItem key={`gap-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={step}>
                <PaginationLink
                  asChild
                  isActive={step === view.page}
                  aria-label={`Go to page ${step}`}
                >
                  <Link to={pathForPage(step)} replace>
                    {step}
                  </Link>
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            {view.page < view.pageCount ? (
              <PaginationNext asChild>
                <Link to={pathForPage(view.page + 1)} replace />
              </PaginationNext>
            ) : (
              <PaginationNext asChild>
                <button type="button" disabled />
              </PaginationNext>
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
