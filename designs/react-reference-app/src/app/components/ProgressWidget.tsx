import { Scale, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { weightChangeKg } from '../domain/bodyMetrics';
import {
  displayWeightValue,
  formatBodyWeight,
  weightUnitLabel,
  type WeightUnit,
} from '../utils/units';
import { PortalWidget, type WidgetPresentation } from './PortalWidget';

interface ProgressProfile {
  startingWeightKg: number;
  currentWeightKg: number;
}

interface ProgressWidgetProps {
  presentation: WidgetPresentation;
  profile: ProgressProfile | null;
  weightUnit: WeightUnit;
  headingId: string;
  className?: string;
}

function trendIconOf(change: number | null): LucideIcon {
  if (change === null) return Scale;

  return change < 0 ? TrendingDown : TrendingUp;
}

export function ProgressWidget({
  presentation,
  profile,
  weightUnit,
  headingId,
  className,
}: ProgressWidgetProps) {
  if (!profile) {
    return (
      <PortalWidget
        presentation={presentation}
        title="Weight"
        icon={trendIconOf(null)}
        headingId={headingId}
        className={className}
      >
        <p className="text-sm text-text-secondary">No weight recorded yet.</p>
      </PortalWidget>
    );
  }

  const change = weightChangeKg(
    profile.startingWeightKg,
    profile.currentWeightKg,
  );

  return (
    <PortalWidget
      presentation={presentation}
      title="Weight"
      icon={trendIconOf(change)}
      headingId={headingId}
      className={className}
      hero={
        <span className="tabular-nums">
          {`${change > 0 ? '+' : ''}${displayWeightValue(change, weightUnit, 1)}`}
        </span>
      }
      heroUnit={weightUnitLabel(weightUnit)}
      context={
        <>
          Since {formatBodyWeight(profile.startingWeightKg, weightUnit)} &rarr;{' '}
          {formatBodyWeight(profile.currentWeightKg, weightUnit)}
        </>
      }
    />
  );
}
