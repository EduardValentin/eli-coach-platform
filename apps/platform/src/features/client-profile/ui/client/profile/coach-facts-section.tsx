import {
  measureUnitLabel,
  measureUnitsOf,
  toDisplayMeasure,
  type MeasureUnits,
  type UnitPreferenceSnapshot,
} from "@eli-coach-platform/domain/client-settings";
import { ABSENT_VALUE } from "@eli-coach-platform/ui/lib";
import {
  Reading,
  SettingsBody,
  SettingsSection,
} from "@eli-coach-platform/ui/portal";
import { ShieldCheck } from "lucide-react";

import { labelForGender } from "~/features/assessment-calls/public/visitor-profile";
import type { OwnClientProfileView } from "~/features/client-profile/public/own-client-profile";
import {
  CLIENT_LEVEL_LABELS,
  CYCLE_MODE_LABELS,
} from "~/features/client-profile/ui/shared/profile/profile-fields";

type CoachFactsSectionProps = {
  profile: OwnClientProfileView & {
    coaching: NonNullable<OwnClientProfileView["coaching"]>;
  };
  unitPreference: UnitPreferenceSnapshot;
};

function goalWeightOf(goalWeightKg: number | null, units: MeasureUnits) {
  return goalWeightKg === null
    ? ABSENT_VALUE
    : `${toDisplayMeasure("weight", goalWeightKg, units)} ${measureUnitLabel("weight", units)}`;
}

export function CoachFactsSection({
  profile,
  unitPreference,
}: CoachFactsSectionProps) {
  const units = measureUnitsOf(unitPreference);
  const { coaching } = profile;
  const { gender } = profile.identity;

  return (
    <SettingsSection
      data-parity-root="ClientCoachFacts"
      description="Mention a change at your next check-in."
      headingId="coach-facts-heading"
      icon={ShieldCheck}
      title="Your coach keeps these up to date"
    >
      <SettingsBody>
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Reading
            as="dl-item"
            label="Gender"
            value={labelForGender(gender)}
            valueParity="coach-fact-gender"
          />
          <Reading
            as="dl-item"
            label="Level"
            value={CLIENT_LEVEL_LABELS[coaching.level]}
            valueParity="coach-fact-level"
          />
          <Reading
            as="dl-item"
            label="Primary goal"
            value={coaching.primaryGoal ?? ABSENT_VALUE}
            valueParity="coach-fact-goal"
          />
          <Reading
            as="dl-item"
            label="Goal weight"
            value={goalWeightOf(coaching.goalWeightKg, units)}
            valueParity="coach-fact-goal-weight"
          />
          <Reading
            as="dl-item"
            label="Lifestyle activity level"
            value={coaching.activityLevel ?? ABSENT_VALUE}
            valueParity="coach-fact-activity"
          />
          {gender !== "male" && (
            <Reading
              as="dl-item"
              label="Cycle mode"
              value={CYCLE_MODE_LABELS[coaching.cycleMode]}
              valueParity="coach-fact-cycle-mode"
            />
          )}
          <Reading
            as="dl-item"
            className="sm:col-span-2"
            label="Dietary restrictions"
            value={coaching.dietaryRestrictions}
            valueParity="coach-fact-restrictions"
          />
        </dl>
      </SettingsBody>
    </SettingsSection>
  );
}
