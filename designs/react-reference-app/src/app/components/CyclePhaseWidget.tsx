import type { ReactNode } from 'react';
import { Droplet } from 'lucide-react';
import { PortalWidget, type WidgetPresentation } from './PortalWidget';
import { Reading } from './Reading';

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
  const isCoach = presentation === 'coach';

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
            style={
              isCoach && phase.phaseColor
                ? { color: phase.phaseColor }
                : undefined
            }
          >
            {phase.phaseName}
          </span>
        ) : undefined
      }
    >
      {phase ? (
        <>
          <Reading label="Day" value={phase.dayInCycle} />
          {children}
        </>
      ) : (
        <p className="text-sm text-text-secondary">No cycle data yet.</p>
      )}
    </PortalWidget>
  );
}
