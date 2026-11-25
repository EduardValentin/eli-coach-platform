import type { ComponentProps, Ref } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from './ui/button';

type MediaOverlayActionsProps = {
  subject: string;
  onReplace: () => void;
  onRemove: () => void;
  disabled?: boolean;
  replaceRef?: Ref<HTMLButtonElement>;
  replaceProps?: Pick<ComponentProps<'button'>, 'aria-invalid' | 'aria-describedby'>;
};

export function MediaOverlayActions({
  subject,
  onReplace,
  onRemove,
  disabled,
  replaceRef,
  replaceProps,
}: MediaOverlayActionsProps) {
  return (
    <div
      className="absolute inset-x-0 top-0 flex justify-end gap-2 bg-gradient-to-b from-surface-inverted/80 via-surface-inverted/40 to-transparent px-2 pt-2 pb-12"
      data-surface="inverted"
      data-parity="media-overlay-actions"
    >
      <Button
        ref={replaceRef}
        type="button"
        aria-label={`Replace ${subject}`}
        onClick={onReplace}
        disabled={disabled}
        variant="glass"
        size="xs"
        {...replaceProps}
      >
        <RefreshCw className="size-3" aria-hidden="true" />
        Replace
      </Button>
      <Button
        type="button"
        aria-label={`Remove ${subject}`}
        onClick={onRemove}
        disabled={disabled}
        variant="glass"
        size="xs"
      >
        <X className="size-3" aria-hidden="true" />
        Remove
      </Button>
    </div>
  );
}
