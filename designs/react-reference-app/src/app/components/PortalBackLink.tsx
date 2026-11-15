import type { MouseEvent, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, type LinkProps } from 'react-router';

type PortalBackLinkProps = {
  to: LinkProps['to'];
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
};

export function PortalBackLink({ to, onClick, children }: PortalBackLinkProps) {
  return (
    <Link
      className="relative hit-area mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
      to={to}
      onClick={onClick}
    >
      <ArrowLeft aria-hidden="true" size={16} /> {children}
    </Link>
  );
}
