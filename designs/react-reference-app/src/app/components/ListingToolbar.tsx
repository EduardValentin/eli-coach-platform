import type { ReactNode } from 'react';

export function ListingToolbar({
  view,
  filters,
  search,
  filtersParity,
  searchParity,
}: {
  view?: ReactNode;
  filters?: ReactNode;
  search?: ReactNode;
  filtersParity?: string;
  searchParity?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
        {view}
        {filters && (
          <div className="grid gap-3 sm:grid-flow-col sm:auto-cols-fr" data-parity={filtersParity}>
            {filters}
          </div>
        )}
      </div>
      {search && (
        <div className="grid w-full gap-3 sm:w-fit sm:max-w-full" data-parity={searchParity}>
          {search}
        </div>
      )}
    </div>
  );
}
