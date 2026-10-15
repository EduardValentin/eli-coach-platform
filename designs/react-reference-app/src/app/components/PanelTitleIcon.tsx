import type { LucideIcon } from 'lucide-react';
import type { WidgetDensity } from './PortalWidget';

const TITLE_ICON_SIZES: Record<WidgetDensity, number> = { default: 18, compact: 16 };

export function PanelTitleIcon({
  icon: Icon,
  density = 'default',
}: {
  icon: LucideIcon;
  density?: WidgetDensity;
}) {
  return (
    <Icon
      aria-hidden="true"
      className="text-brand-secondary"
      size={TITLE_ICON_SIZES[density]}
    />
  );
}
