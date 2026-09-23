import type { ComponentProps } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Loader2, type LucideIcon } from 'lucide-react';
import { Button, buttonVariants } from './ui/button';
import { cn } from './ui/utils';

type RowActionTone = 'default' | 'primary' | 'destructive';

const TONE_VARIANT: Record<RowActionTone, 'outline' | 'outline-primary'> = {
  default: 'outline',
  primary: 'outline-primary',
  destructive: 'outline',
};

const TONE_CLASSES: Record<RowActionTone, string> = {
  default: '',
  primary: '',
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
  icon?: LucideIcon;
  tone?: RowActionTone;
  busy?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={TONE_VARIANT[tone]}
      size="sm"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(TONE_CLASSES[tone], className)}
      {...props}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      ) : null}
      {children}
    </Button>
  );
}

export function RowActionLink({
  icon: Icon,
  tone = 'default',
  className,
  children,
  ...props
}: LinkProps & { icon?: LucideIcon; tone?: RowActionTone }) {
  return (
    <Link
      className={cn(
        buttonVariants({ variant: TONE_VARIANT[tone], size: 'sm' }),
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      {children}
    </Link>
  );
}
