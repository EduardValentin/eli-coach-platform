import type { ReactNode } from 'react';
import { PortalWidget, type WidgetHeroSize } from '../PortalWidget';

interface ClientWidgetProps {
  eyebrow: ReactNode;
  icon?: ReactNode;
  hero?: ReactNode;
  heroSize?: WidgetHeroSize;
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
  heroSize,
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
      heroSize={heroSize}
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
