import type { MouseEvent, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, type LinkProps } from 'react-router';
import { cn } from './ui/utils';

type PortalBackLinkProps = {
  to: LinkProps['to'];
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  navigationLabel?: string;
  children: ReactNode;
};

const GAP_TO_PAGE_CLASS = 'mb-8';

export function PortalBackLink({ to, onClick, navigationLabel, children }: PortalBackLinkProps) {
  const link = (
    <Link
      className={cn('relative hit-area inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary', {
        [GAP_TO_PAGE_CLASS]: navigationLabel === undefined,
      })}
      to={to}
      onClick={onClick}
    >
      <ArrowLeft aria-hidden="true" size={16} /> {children}
    </Link>
  );
  if (navigationLabel === undefined) return link;
  return (
    <nav aria-label={navigationLabel} className={GAP_TO_PAGE_CLASS}>
      {link}
    </nav>
  );
}
