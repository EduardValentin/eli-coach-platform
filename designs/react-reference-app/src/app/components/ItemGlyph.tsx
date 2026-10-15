import type { LucideIcon } from 'lucide-react';

export function ItemGlyph({ icon: Icon, parity }: { icon: LucideIcon; parity?: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-quiet text-text-secondary"
      data-parity={parity}
    >
      <Icon size={18} />
    </span>
  );
}
