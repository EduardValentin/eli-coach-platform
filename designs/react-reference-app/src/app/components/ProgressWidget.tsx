import { Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { weightChangeKg } from '../domain/bodyMetrics';
import {
  displayWeightValue,
  formatBodyWeight,
  weightUnitLabel,
  type WeightUnit,
} from '../utils/units';
import { PortalWidget, type WidgetPresentation } from './PortalWidget';
import { Reading } from './Reading';

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

function TrendIcon({ change }: { change: number | null }) {
  const Icon = change === null ? Scale : change < 0 ? TrendingDown : TrendingUp;

  return <Icon aria-hidden="true" className="text-brand-secondary" size={18} />;
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
        title="Progress"
        icon={<TrendIcon change={null} />}
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
      title="Progress"
      icon={<TrendIcon change={change} />}
      headingId={headingId}
      className={className}
    >
      <Reading
        label="Weight change"
        size="lg"
        unit={weightUnitLabel(weightUnit)}
        value={`${change > 0 ? '+' : ''}${displayWeightValue(change, weightUnit, 1)}`}
      />
      <p className="mt-2 text-sm text-text-secondary">
        Since {formatBodyWeight(profile.startingWeightKg, weightUnit)} &rarr;{' '}
        {formatBodyWeight(profile.currentWeightKg, weightUnit)}
      </p>
    </PortalWidget>
  );
}
