import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link, type LinkProps } from "react-router";

import { cn } from "../lib/cn";

type WidgetLinkProps = LinkProps & {
  arrow?: boolean;
  children: ReactNode;
};

export function WidgetLink({
  className,
  children,
  arrow = false,
  ...props
}: WidgetLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-portal-accent transition-colors hover:text-portal-accent-hover",
        className,
      )}
      {...props}
    >
      {children}
      {arrow && <ArrowRight aria-hidden="true" size={16} />}
    </Link>
  );
}
