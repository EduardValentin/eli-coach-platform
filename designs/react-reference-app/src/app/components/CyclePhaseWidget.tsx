import type { ReactNode } from 'react';
import { Droplet } from 'lucide-react';
import { PortalWidget, type WidgetPresentation } from './PortalWidget';

interface CyclePhase {
  phaseName: string;
  dayInCycle: number;
  phaseColor?: string;
}

interface CyclePhaseWidgetProps {
  presentation: WidgetPresentation;
  phase: CyclePhase | null;
  headingId: string;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function CyclePhaseWidget({
  presentation,
  phase,
  headingId,
  footer,
  className,
  children,
}: CyclePhaseWidgetProps) {
  return (
    <PortalWidget
      presentation={presentation}
      title="Cycle phase"
      icon={
        <Droplet
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      headingId={headingId}
      footer={footer}
      className={className}
      hero={
        phase ? (
          <span
            style={phase.phaseColor ? { color: phase.phaseColor } : undefined}
          >
            {phase.phaseName}
          </span>
        ) : undefined
      }
      context={phase ? `Day ${phase.dayInCycle}` : undefined}
    >
      {phase ? (
        children
      ) : (
        <p className="text-sm text-text-secondary">No cycle data yet.</p>
      )}
    </PortalWidget>
  );
}
