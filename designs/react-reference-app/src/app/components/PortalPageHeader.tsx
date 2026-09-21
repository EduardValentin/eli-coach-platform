import type { ReactNode } from 'react';

export const PORTAL_PAGE_TITLE_CLASS =
  'font-serif text-3xl lg:text-4xl tracking-tight text-text-primary';

export function PortalPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <h1 className={PORTAL_PAGE_TITLE_CLASS}>{title}</h1>
        {subtitle && <p className="text-text-secondary">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 md:shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
