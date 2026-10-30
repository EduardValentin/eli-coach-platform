import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, type LinkProps } from "react-router";

type PortalBackLinkProps = {
  to: LinkProps["to"];
  children: ReactNode;
};

export function PortalBackLink({ to, children }: PortalBackLinkProps) {
  return (
    <Link
      className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
      to={to}
    >
      <ArrowLeft aria-hidden="true" size={16} /> {children}
    </Link>
  );
}
