import type { LucideIcon } from 'lucide-react';

const TITLE_ICON_SIZES = { default: 18, compact: 16 } as const;

type PanelTitleDensity = keyof typeof TITLE_ICON_SIZES;

export function PanelTitleIcon({
  icon: Icon,
  density = 'default',
}: {
  icon: LucideIcon;
  density?: PanelTitleDensity;
}) {
  return (
    <Icon
      aria-hidden="true"
      className="text-brand-secondary"
      size={TITLE_ICON_SIZES[density]}
    />
  );
}
