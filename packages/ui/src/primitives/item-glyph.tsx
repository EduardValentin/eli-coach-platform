import type { LucideIcon } from "lucide-react";

import { cn } from "../lib/cn";
import type { DataAttributes } from "../lib/data-attributes";

type ItemGlyphProps = DataAttributes & {
  icon: LucideIcon;
  className?: string;
};

export function ItemGlyph({
  icon: Icon,
  className,
  ...dataAttributes
}: ItemGlyphProps) {
  return (
    <span
      {...dataAttributes}
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-quiet text-text-secondary",
        className,
      )}
    >
      <Icon size={18} />
    </span>
  );
}
