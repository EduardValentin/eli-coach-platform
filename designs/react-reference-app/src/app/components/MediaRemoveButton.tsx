import type { ComponentProps } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

type MediaRemoveButtonProps = Omit<ComponentProps<'button'>, 'aria-label' | 'children'> & {
  'aria-label': string;
};

export function MediaRemoveButton({ className, ...props }: MediaRemoveButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-xs"
      elevation="card"
      className={cn('not-aria-disabled:hover:bg-surface-muted', className)}
      {...props}
    >
      <X aria-hidden="true" />
    </Button>
  );
}
