import { useId } from 'react';
import { useUnitPreferences } from '../../../context/UnitPreferencesContext';
import type { UnitPreference } from '../../../services/onboardingService';
import {
  MEASUREMENT_SYSTEM_LABELS,
  MEASUREMENT_SYSTEM_UNITS,
  measurementSystemOf,
  type MeasurementSystem,
} from '../../../utils/units';
import { ChoiceGroup, ChoiceOption } from '../../ChoiceGroup';
import { ONBOARDING_LEGEND_CLASS } from './onboardingCard';

const LEGEND = 'How do you measure?';

const SYSTEMS: readonly MeasurementSystem[] = ['metric', 'imperial'];

type MeasurementSystemFieldProps = {
  onChoose: (preference: UnitPreference) => void;
};

export function MeasurementSystemField({
  onChoose,
}: MeasurementSystemFieldProps) {
  const { weightUnit, setMeasurementSystem } = useUnitPreferences();
  const legendId = useId();

  const chooseSystem = (system: MeasurementSystem) => {
    setMeasurementSystem(system);
    onChoose(MEASUREMENT_SYSTEM_UNITS[system]);
  };

  return (
    <fieldset>
      <legend className={ONBOARDING_LEGEND_CLASS} id={legendId}>
        {LEGEND}
      </legend>
      <ChoiceGroup
        aria-labelledby={legendId}
        className="mt-2"
        onValueChange={(next) => chooseSystem(next as MeasurementSystem)}
        value={measurementSystemOf(weightUnit)}
      >
        {SYSTEMS.map((system) => (
          <ChoiceOption key={system} value={system}>
            {MEASUREMENT_SYSTEM_LABELS[system]}
          </ChoiceOption>
        ))}
      </ChoiceGroup>
    </fieldset>
  );
}
