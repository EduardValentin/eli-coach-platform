import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Link, type LinkProps } from "react-router";

import { cn } from "../lib/cn";

type WidgetLinkTrailing = "arrow";

const WIDGET_LINK_CLASS =
  "inline-flex items-center gap-1.5 text-sm font-medium text-portal-accent transition-colors hover:text-portal-accent-hover aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:text-portal-accent";

type WidgetLinkContentProps = {
  trailing?: WidgetLinkTrailing;
  children: React.ReactNode;
};

function WidgetLinkContent({ trailing, children }: WidgetLinkContentProps) {
  return (
    <>
      {children}
      {trailing === "arrow" && <ArrowRight aria-hidden="true" size={16} />}
    </>
  );
}

type WidgetLinkProps = LinkProps & WidgetLinkContentProps;

export function WidgetLink({
  className,
  children,
  trailing,
  ...props
}: WidgetLinkProps) {
  return (
    <Link className={cn(WIDGET_LINK_CLASS, className)} {...props}>
      <WidgetLinkContent trailing={trailing}>{children}</WidgetLinkContent>
    </Link>
  );
}

type WidgetActionProps = React.ComponentPropsWithoutRef<"button"> & {
  trailing?: WidgetLinkTrailing;
};

export const WidgetAction = React.forwardRef<
  HTMLButtonElement,
  WidgetActionProps
>(({ className, children, trailing, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(WIDGET_LINK_CLASS, className)}
    {...props}
  >
    <WidgetLinkContent trailing={trailing}>{children}</WidgetLinkContent>
  </button>
));

WidgetAction.displayName = "WidgetAction";
