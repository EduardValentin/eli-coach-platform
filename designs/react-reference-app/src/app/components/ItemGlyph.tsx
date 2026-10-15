import type { LucideIcon } from 'lucide-react';
import { cn } from './ui/utils';

export function ItemGlyph({
  icon: Icon,
  className,
  parity,
}: {
  icon: LucideIcon;
  className?: string;
  parity?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-quiet text-text-secondary',
        className,
      )}
      data-parity={parity}
    >
      <Icon size={18} />
    </span>
  );
}
