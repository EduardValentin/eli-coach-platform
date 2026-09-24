import { SlidersHorizontal } from 'lucide-react';
import { ChoiceGroup, ChoiceOption } from './ChoiceGroup';
import { SettingsSection, SettingsRows, SettingsRow } from './SettingsSection';
import { useUnitPreferences } from '../context/UnitPreferencesContext';
import { formatBodyWeight, formatHeight } from '../utils/units';
import type { WeightUnit, HeightUnit } from '../utils/units';

interface UnitPreferencesSettingsProps {
  /** Sample weight (kg) used only for the preview text; defaults to a neutral sample. */
  sampleWeightKg?: number;
  /** Sample height (cm) used only for the preview text; defaults to a neutral sample. */
  sampleHeightCm?: number;
}

export function UnitPreferencesSettings({
  sampleWeightKg = 66.1,
  sampleHeightCm = 165,
}: UnitPreferencesSettingsProps) {
  const { weightUnit, heightUnit, setWeightUnit, setHeightUnit } =
    useUnitPreferences();

  return (
    <SettingsSection
      headingId="units-heading"
      title="Units & Measurements"
      icon={
        <SlidersHorizontal
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      description="Preferences are saved to this device."
    >
      <SettingsRows>
        <SettingsRow
          labelId="weight-unit-label"
          title="Body weight & loads"
          description="Used for weight, training loads, and workout volume."
          hint={`e.g. ${formatBodyWeight(sampleWeightKg, weightUnit)}`}
        >
          <ChoiceGroup
            value={weightUnit}
            onValueChange={(v) => setWeightUnit(v as WeightUnit)}
            aria-labelledby="weight-unit-label"
            className="w-full max-w-[240px]"
          >
            <ChoiceOption value="kg" aria-label="Kilograms">
              kg
            </ChoiceOption>
            <ChoiceOption value="lb" aria-label="Pounds">
              lb
            </ChoiceOption>
          </ChoiceGroup>
        </SettingsRow>

        <SettingsRow
          labelId="height-unit-label"
          title="Height"
          description="Used wherever height is shown."
          hint={`e.g. ${formatHeight(sampleHeightCm, heightUnit)}`}
        >
          <ChoiceGroup
            value={heightUnit}
            onValueChange={(v) => setHeightUnit(v as HeightUnit)}
            aria-labelledby="height-unit-label"
            className="w-full max-w-[240px]"
          >
            <ChoiceOption value="cm" aria-label="Centimetres">
              cm
            </ChoiceOption>
            <ChoiceOption value="ft-in" aria-label="Feet and inches">
              ft·in
            </ChoiceOption>
          </ChoiceGroup>
        </SettingsRow>
      </SettingsRows>
    </SettingsSection>
  );
}
