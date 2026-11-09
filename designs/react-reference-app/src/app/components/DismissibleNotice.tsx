import type { ComponentProps } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

type DismissibleNoticeProps = Omit<ComponentProps<'div'>, 'role'> & {
  onDismiss: () => void;
};

export function DismissibleNotice({ children, className, onDismiss, ...props }: DismissibleNoticeProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-control border border-border-subtle bg-surface-base px-4 py-3 text-left',
        className,
      )}
      role="status"
      {...props}
    >
      <p className="flex-1 text-sm text-text-secondary">{children}</p>
      <Button
        aria-label="Dismiss"
        className="-mr-2 -mt-1 text-text-secondary"
        onClick={onDismiss}
        size="icon-xs"
        variant="outline"
      >
        <X aria-hidden="true" size={16} />
      </Button>
    </div>
  );
}
