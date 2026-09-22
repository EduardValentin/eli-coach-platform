import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";
import { Link } from "react-router";

import { cn } from "../lib/cn";

const stepClassNames = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium outline-none transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      emphasis: {
        current:
          "border border-control-border-soft bg-surface-base text-text-label hover:bg-surface-quiet hover:text-text-primary",
        quiet: "hover:bg-surface-neutral hover:text-text-primary",
      },
      shape: {
        page: "size-9 rounded-full",
        step: "h-9 gap-1 px-3 py-2",
      },
    },
    defaultVariants: {
      emphasis: "quiet",
      shape: "page",
    },
  },
);

type StepVariantProps = VariantProps<typeof stepClassNames>;

function stepClasses(options?: StepVariantProps): string {
  return cn(stepClassNames(options));
}

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
        className={stepClasses()}
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
        className={stepClasses({ emphasis: "current" })}
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
      <ChevronLeft aria-hidden="true" />
      <span className="hidden sm:block">Previous</span>
    </PaginationEdge>
  );
}

export function PaginationNext({ to }: EdgeProps) {
  return (
    <PaginationEdge label="Go to next page" to={to}>
      <span className="hidden sm:block">Next</span>
      <ChevronRight aria-hidden="true" />
    </PaginationEdge>
  );
}

export function PaginationEllipsis() {
  return (
    <li aria-hidden="true">
      <span className="flex size-9 items-center justify-center">
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
  const className = stepClasses({ shape: "step" });

  return (
    <li>
      {to === null ? (
        <button aria-label={label} className={className} disabled type="button">
          {children}
        </button>
      ) : (
        <Link
          aria-label={label}
          className={className}
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
