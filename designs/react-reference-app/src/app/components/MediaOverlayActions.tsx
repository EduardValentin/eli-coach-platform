import type { ComponentProps } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button as ThemeButton } from './ThemeButton';

type MediaOverlayActionsProps = {
  subject: string;
  onReplace: () => void;
  onRemove: () => void;
  replaceProps?: Pick<ComponentProps<'button'>, 'aria-invalid' | 'aria-describedby'>;
};

export function MediaOverlayActions({ subject, onReplace, onRemove, replaceProps }: MediaOverlayActionsProps) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-surface-inverted/80 via-surface-inverted/40 to-transparent px-2 pt-12 pb-2"
      data-surface="inverted"
    >
      <ThemeButton
        type="button"
        aria-label={`Replace ${subject}`}
        onClick={onReplace}
        variant="glass"
        size="xs"
        {...replaceProps}
      >
        <RefreshCw size={12} aria-hidden="true" />
        Replace
      </ThemeButton>
      <ThemeButton type="button" aria-label={`Remove ${subject}`} onClick={onRemove} variant="glass" size="xs">
        <X size={12} aria-hidden="true" />
        Remove
      </ThemeButton>
    </div>
  );
}
