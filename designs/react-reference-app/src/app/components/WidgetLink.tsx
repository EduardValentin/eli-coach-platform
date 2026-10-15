import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { cn } from './ui/utils';

type WidgetLinkTrailing = 'arrow';

const WIDGET_LINK_CLASS =
  'inline-flex items-center gap-1.5 text-sm font-medium text-portal-accent transition-colors hover:text-portal-accent-hover aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:text-portal-accent';

function WidgetLinkContent({
  trailing,
  children,
}: {
  trailing?: WidgetLinkTrailing;
  children: ReactNode;
}) {
  return (
    <>
      {children}
      {trailing === 'arrow' && <ArrowRight aria-hidden="true" size={16} />}
    </>
  );
}

export function WidgetLink({
  className,
  children,
  trailing,
  ...props
}: LinkProps & { trailing?: WidgetLinkTrailing; children: ReactNode }) {
  return (
    <Link className={cn(WIDGET_LINK_CLASS, className)} {...props}>
      <WidgetLinkContent trailing={trailing}>{children}</WidgetLinkContent>
    </Link>
  );
}

export const WidgetAction = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<'button'> & { trailing?: WidgetLinkTrailing }
>(function WidgetAction({ className, children, trailing, type = 'button', ...props }, ref) {
  return (
    <button ref={ref} type={type} className={cn(WIDGET_LINK_CLASS, className)} {...props}>
      <WidgetLinkContent trailing={trailing}>{children}</WidgetLinkContent>
    </button>
  );
});
