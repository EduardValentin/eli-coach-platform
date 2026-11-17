import type { ReactNode, Ref } from 'react';
import { PORTAL_PAGE_TITLE_CLASS, EYEBROW_CLASS } from './typography';
import { cn } from './ui/utils';

type HeaderActionsPlacement = 'below-title-on-phone' | 'beside-title';

const PLACEMENT_CLASS: Record<HeaderActionsPlacement, string> = {
  'below-title-on-phone': 'flex-col md:flex-row md:items-end md:justify-between',
  'beside-title': 'flex-row flex-wrap items-end justify-between',
};

export function PortalPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  actionsPlacement = 'below-title-on-phone',
  headingId,
  headingRef,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  actionsPlacement?: HeaderActionsPlacement;
  headingId?: string;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const focusable = headingRef !== undefined;

  return (
    <header className={cn('mb-8 flex gap-4', PLACEMENT_CLASS[actionsPlacement])}>
      <div className="space-y-2">
        {eyebrow && <p className={EYEBROW_CLASS}>{eyebrow}</p>}
        <h1
          id={headingId}
          className={cn(PORTAL_PAGE_TITLE_CLASS, { 'outline-none': focusable })}
          ref={headingRef}
          tabIndex={focusable ? -1 : undefined}
        >
          {title}
        </h1>
        {subtitle && (
          <p data-parity="page-subtitle" className="text-text-secondary">
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
