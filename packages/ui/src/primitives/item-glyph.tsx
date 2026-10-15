import type { LucideIcon } from "lucide-react";

import type { DataAttributes } from "../lib/data-attributes";

type ItemGlyphProps = DataAttributes & {
  icon: LucideIcon;
};

export function ItemGlyph({ icon: Icon, ...dataAttributes }: ItemGlyphProps) {
  return (
    <span
      {...dataAttributes}
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-quiet text-text-secondary"
    >
      <Icon size={18} />
    </span>
  );
}
