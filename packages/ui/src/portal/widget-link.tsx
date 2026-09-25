import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link, type LinkProps } from "react-router";

import { cn } from "../lib/cn";

type WidgetLinkTrailing = "arrow";

type WidgetLinkProps = LinkProps & {
  trailing?: WidgetLinkTrailing;
  children: ReactNode;
};

export function WidgetLink({
  className,
  children,
  trailing,
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
      {trailing === "arrow" && <ArrowRight aria-hidden="true" size={16} />}
    </Link>
  );
}
