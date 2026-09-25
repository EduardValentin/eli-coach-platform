import * as React from "react";
import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";
import { Link } from "react-router";

import { cn } from "../lib/cn";
import { buttonVariants } from "./button";

const PAGE_CLASS_NAME = buttonVariants({ size: "icon-xs", variant: "ghost" });
const CURRENT_PAGE_CLASS_NAME = buttonVariants({
  size: "icon-xs",
  variant: "outline",
});
const EDGE_CLASS_NAME = buttonVariants({
  className: "gap-1 px-2.5",
  size: "xs",
  variant: "ghost",
});

type PageProps = {
  page: number;
  to: string;
};

type EdgeProps = {
  to: string | null;
};

export function Pagination({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"nav">) {
  return (
    <nav
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

export function PaginationList(props: React.ComponentPropsWithoutRef<"ul">) {
  return <ul className="flex flex-row items-center gap-1" {...props} />;
}

export function PaginationLink({ page, to }: PageProps) {
  return (
    <li>
      <Link
        aria-label={`Go to page ${page}`}
        className={PAGE_CLASS_NAME}
        prefetch="intent"
        replace
        to={to}
      >
        {page}
      </Link>
    </li>
  );
}

export function PaginationCurrentPage({ page, to }: PageProps) {
  return (
    <li>
      <Link
        aria-current="page"
        aria-label={`Go to page ${page}`}
        className={CURRENT_PAGE_CLASS_NAME}
        prefetch="intent"
        replace
        to={to}
      >
        {page}
      </Link>
    </li>
  );
}

export function PaginationPrevious({ to }: EdgeProps) {
  return (
    <PaginationEdge label="Go to previous page" to={to}>
      <ChevronLeft aria-hidden="true" className="size-4" />
      <span className="hidden sm:block">Previous</span>
    </PaginationEdge>
  );
}

export function PaginationNext({ to }: EdgeProps) {
  return (
    <PaginationEdge label="Go to next page" to={to}>
      <span className="hidden sm:block">Next</span>
      <ChevronRight aria-hidden="true" className="size-4" />
    </PaginationEdge>
  );
}

export function PaginationEllipsis() {
  return (
    <li aria-hidden="true">
      <span className="flex size-8 items-center justify-center">
        <Ellipsis aria-hidden="true" className="size-4" />
        <span className="sr-only">More pages</span>
      </span>
    </li>
  );
}

function PaginationEdge(props: {
  children: React.ReactNode;
  label: string;
  to: string | null;
}) {
  const { children, label, to } = props;

  return (
    <li>
      {to === null ? (
        <button
          aria-label={label}
          className={EDGE_CLASS_NAME}
          disabled
          type="button"
        >
          {children}
        </button>
      ) : (
        <Link
          aria-label={label}
          className={EDGE_CLASS_NAME}
          prefetch="intent"
          replace
          to={to}
        >
          {children}
        </Link>
      )}
    </li>
  );
}
