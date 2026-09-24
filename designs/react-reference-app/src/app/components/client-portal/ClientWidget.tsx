import type { ReactNode } from 'react';
import { PortalWidget, type WidgetDensity } from '../PortalWidget';

interface ClientWidgetProps {
  eyebrow: ReactNode;
  icon?: ReactNode;
  hero?: ReactNode;
  density?: WidgetDensity;
  voice?: ReactNode;
  headingId: string;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
  footer?: ReactNode;
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
    >
      {children}
    </PortalWidget>
  );
}
