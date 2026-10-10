import type { ReactNode, Ref } from "react";

import { cn } from "../lib/cn";
import { PORTAL_PAGE_TITLE_CLASS } from "../lib/typography";

type PortalPageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
};

export function PortalPageHeader({
  title,
  subtitle,
  actions,
  headingRef,
}: PortalPageHeaderProps) {
  const focusable = headingRef !== undefined;

  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <h1
          className={cn(PORTAL_PAGE_TITLE_CLASS, { "outline-none": focusable })}
          ref={headingRef}
          tabIndex={focusable ? -1 : undefined}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-text-secondary" data-parity="page-subtitle">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 md:shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
