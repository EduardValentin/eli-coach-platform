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
  children?: ReactNode;
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
        {label}
      </p>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

export function ProfileDetailsWidget({
  presentation,
  profile,
  units,
  headingId,
  footer,
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
    >
      <div className="space-y-4">
        <Reading label="Height & weight" value={heightWeight} />
        <Reading label="Activity level" value={activity} />
        {children}
      </div>
    </PortalWidget>
  );
}
