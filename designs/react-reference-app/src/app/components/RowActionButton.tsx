import type { ComponentProps } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Loader2, type LucideIcon } from 'lucide-react';
import { Button, buttonVariants } from './ui/button';
import { cn } from './ui/utils';

type RowActionTone = 'default' | 'primary' | 'destructive';

const TONE_VARIANT: Record<
  RowActionTone,
  'outline' | 'primary' | 'destructive-outline'
> = {
  default: 'outline',
  primary: 'primary',
  destructive: 'destructive-outline',
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
      size="xs"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={className}
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
      className={buttonVariants({
        variant: TONE_VARIANT[tone],
        size: 'xs',
        className,
      })}
      {...props}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      {children}
    </Link>
  );
}
