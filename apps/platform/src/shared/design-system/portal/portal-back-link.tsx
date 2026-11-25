import type { MouseEvent, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, type LinkProps } from "react-router";

import { cn } from "../lib/cn";

type BackLinkGap = "page" | "title";

type PortalBackLinkProps = {
  to: LinkProps["to"];
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  navigationLabel?: string;
  gap?: BackLinkGap;
  children: ReactNode;
};

const GAP_CLASS: Record<BackLinkGap, string> = { page: "mb-8", title: "mb-1" };

export const BACK_LINK_CLASS =
  "relative hit-area inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary";

export function PortalBackLink({
  to,
  onClick,
  navigationLabel,
  gap = "page",
  children,
}: PortalBackLinkProps) {
  const link = (
    <Link
      className={cn(BACK_LINK_CLASS, {
        [GAP_CLASS[gap]]: navigationLabel === undefined,
      })}
      to={to}
      onClick={onClick}
    >
      <ArrowLeft aria-hidden="true" size={16} /> {children}
    </Link>
  );
  if (navigationLabel === undefined) return link;
  return (
    <nav aria-label={navigationLabel} className={GAP_CLASS[gap]}>
      {link}
    </nav>
  );
}
