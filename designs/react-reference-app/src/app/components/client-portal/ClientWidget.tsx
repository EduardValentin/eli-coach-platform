import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { PortalWidget, type WidgetDensity } from '../PortalWidget';

interface ClientWidgetProps {
  eyebrow: ReactNode;
  icon?: LucideIcon;
  hero?: ReactNode;
  density?: WidgetDensity;
  voice?: ReactNode;
  headingId: string;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
  footer?: ReactNode;
  parityRoot?: string;
}

export function ClientWidget({
  eyebrow,
  icon,
  hero,
  density,
  voice,
  headingId,
  children,
  className,
  action,
  footer,
  parityRoot,
}: ClientWidgetProps) {
  return (
    <PortalWidget
      presentation="client"
      title={eyebrow}
      icon={icon}
      hero={hero}
      density={density}
      voice={voice}
      headingId={headingId}
      action={action}
      footer={footer}
      className={className}
      parityRoot={parityRoot}
    >
      {children}
    </PortalWidget>
  );
}
