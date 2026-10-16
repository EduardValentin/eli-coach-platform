import type { LucideIcon } from "lucide-react";

import { cn } from "../lib/cn";
import type { DataAttributes } from "../lib/data-attributes";

type ItemVisualProps = DataAttributes & {
  icon: LucideIcon;
  name: string;
  iconSize?: number;
  className?: string;
};

export function ItemVisual({
  icon: Icon,
  name,
  iconSize = 28,
  className,
  ...data
}: ItemVisualProps) {
  return (
    <div
      {...data}
      aria-label={name}
      className={cn(
        "flex items-center justify-center bg-surface-quiet",
        className,
      )}
      role="img"
    >
      <Icon aria-hidden="true" size={iconSize} />
    </div>
  );
}
