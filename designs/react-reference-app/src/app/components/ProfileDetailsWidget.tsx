import type { ReactNode } from 'react';
import { User } from 'lucide-react';
import {
  ACTIVITY_LEVEL_LABELS,
  type ActivityLevel,
} from '../context/ClientProfileContext';
import {
  formatBodyWeight,
  formatHeight,
  type HeightUnit,
  type WeightUnit,
} from '../utils/units';
import { PortalWidget, type WidgetPresentation } from './PortalWidget';
import { Reading } from './Reading';

interface ProfileDetailsSubject {
  heightCm: number;
  currentWeightKg: number;
  activityLevel: ActivityLevel;
}

interface ProfileDetailsUnits {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
}

interface ProfileDetailsWidgetProps {
  presentation: WidgetPresentation;
  profile: ProfileDetailsSubject | null;
  units: ProfileDetailsUnits;
  headingId: string;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function ProfileDetailsWidget({
  presentation,
  profile,
  units,
  headingId,
  footer,
  className,
  children,
}: ProfileDetailsWidgetProps) {
  const heightWeight = profile
    ? `${formatHeight(profile.heightCm, units.heightUnit)} / ${formatBodyWeight(profile.currentWeightKg, units.weightUnit)}`
    : '--';
  const activity = profile
    ? ACTIVITY_LEVEL_LABELS[profile.activityLevel]
    : '--';

  return (
    <PortalWidget
      presentation={presentation}
      title="Profile details"
      icon={
        <User aria-hidden="true" className="text-brand-secondary" size={18} />
      }
      headingId={headingId}
      footer={footer}
      className={className}
    >
      <div className="space-y-4">
        <Reading label="Height & weight" value={heightWeight} />
        <Reading label="Activity level" value={activity} />
        {children}
      </div>
    </PortalWidget>
  );
}
