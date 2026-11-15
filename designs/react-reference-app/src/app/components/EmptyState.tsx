import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './ui/utils';

type EmptyStateDensity = 'default' | 'compact';

export function EmptyState({
  icon: Icon,
  title,
  description,
  descriptionParity,
  action,
  density = 'default',
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  descriptionParity?: string;
  action?: ReactNode;
  density?: EmptyStateDensity;
}) {
  const compact = density === 'compact';
  return (
    <div
      className={cn('flex flex-col', {
        'items-center gap-3 py-12 text-center': !compact,
        'items-start gap-4 px-1 py-4 text-left': compact,
      })}
    >
      {Icon && (
        <div
          className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-text-secondary"
          data-parity="empty-icon"
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
      )}
      <div className={cn('grid', { 'justify-items-center gap-3': !compact, 'gap-1': compact })}>
        <p className={cn('font-semibold text-text-primary', { 'text-base': !compact, 'text-sm': compact })}>{title}</p>
        {description && (
          <p className="max-w-sm text-sm text-text-secondary" data-parity={descriptionParity}>
            {description}
          </p>
        )}
      </div>
      {action && <div className={cn({ 'mt-1': !compact })}>{action}</div>}
    </div>
  );
}
