import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { cn } from './ui/utils';

export function WidgetLink({
  className,
  children,
  arrow = false,
  ...props
}: LinkProps & { arrow?: boolean; children: ReactNode }) {
  return (
    <Link
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium text-portal-accent transition-colors hover:text-portal-accent-hover',
        className,
      )}
      {...props}
    >
      {children}
      {arrow && <ArrowRight aria-hidden="true" size={16} />}
    </Link>
  );
}
