import type { ComponentProps } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Loader2, type LucideIcon } from 'lucide-react';
import { Button, buttonVariants } from './ui/button';
import { cn } from './ui/utils';

type RowActionTone = 'default' | 'destructive';

const TONE_CLASSES: Record<RowActionTone, string> = {
  default: '',
  destructive:
    'text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive',
};

export function RowActionButton({
  icon: Icon,
  tone = 'default',
  busy = false,
  disabled,
  className,
  children,
  ...props
}: ComponentProps<'button'> & {
  icon: LucideIcon;
  tone?: RowActionTone;
  busy?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn('text-xs font-semibold', TONE_CLASSES[tone], className)}
      {...props}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      {children}
    </Button>
  );
}

export function RowActionLink({
  icon: Icon,
  className,
  children,
  ...props
}: LinkProps & { icon: LucideIcon }) {
  return (
    <Link
      className={cn(
        buttonVariants({ variant: 'outline', size: 'sm' }),
        'text-xs font-semibold',
        className,
      )}
      {...props}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </Link>
  );
}
