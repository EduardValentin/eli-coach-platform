import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/cn";

export type TableSort = "ascending" | "descending" | "none";

type SortableHeadProps = {
  onSort: () => void;
  sort: TableSort;
};

type PlainHeadProps = {
  onSort?: never;
  sort?: never;
};

type TableHeadProps = React.ComponentPropsWithoutRef<"th"> &
  (SortableHeadProps | PlainHeadProps);

const SORT_ICONS = {
  ascending: ChevronUp,
  descending: ChevronDown,
  none: ChevronsUpDown,
} satisfies Record<TableSort, React.ElementType>;

export function Table({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"table">) {
  return (
    <div
      className="relative w-full overflow-x-auto"
      data-slot="table-container"
    >
      <table
        className={cn("w-full caption-bottom text-sm", className)}
        data-slot="table"
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      className={cn("[&_tr]:bg-surface-quiet/50", className)}
      data-slot="table-header"
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"tbody">) {
  return (
    <tbody
      className={cn("[&_tr:last-child]:border-0", className)}
      data-slot="table-body"
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border-default/50 transition-colors hover:bg-surface-quiet/50",
        className,
      )}
      data-slot="table-row"
      {...props}
    />
  );
}

export function TableHead({
  children,
  className,
  onSort,
  sort,
  ...props
}: TableHeadProps) {
  return (
    <th
      aria-sort={sort}
      className={cn(
        "px-6 py-4 text-left align-middle text-label whitespace-nowrap text-text-secondary uppercase",
        className,
      )}
      data-slot="table-head"
      {...props}
    >
      {sort ? (
        <SortButton onSort={onSort} sort={sort}>
          {children}
        </SortButton>
      ) : (
        children
      )}
    </th>
  );
}

function SortButton({
  children,
  onSort,
  sort,
}: SortableHeadProps & { children: React.ReactNode }) {
  const SortIcon = SORT_ICONS[sort];
  const sorted = sort !== "none";

  return (
    <button
      className="inline-flex items-center gap-1 rounded-field transition-colors hover:text-primary"
      onClick={onSort}
      type="button"
    >
      <span className={cn({ "text-primary": sorted })}>{children}</span>
      <SortIcon
        aria-hidden="true"
        className={cn("size-3", {
          "text-primary": sorted,
          "text-text-muted": !sorted,
        })}
      />
    </button>
  );
}

export function TableCell({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className={cn("px-6 py-4 align-middle", className)}
      data-slot="table-cell"
      {...props}
    />
  );
}
