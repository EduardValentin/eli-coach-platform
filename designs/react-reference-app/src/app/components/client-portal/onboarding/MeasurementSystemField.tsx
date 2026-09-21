import { useId } from 'react';
import { useUnitPreferences } from '../../../context/UnitPreferencesContext';
import {
  MEASUREMENT_SYSTEM_LABELS,
  measurementSystemOf,
  type MeasurementSystem,
} from '../../../utils/units';
import { RadioGroup } from '../../ui/radio-group';
import { ONBOARDING_LEGEND_CLASS } from './onboardingCard';
import { OnboardingRadioOption } from './OnboardingRadioOption';

const LEGEND = 'How do you measure?';

const SYSTEMS: readonly MeasurementSystem[] = ['metric', 'imperial'];

export function MeasurementSystemField() {
  const { weightUnit, setMeasurementSystem } = useUnitPreferences();
  const legendId = useId();

  return (
    <fieldset>
      <legend className={ONBOARDING_LEGEND_CLASS} id={legendId}>
        {LEGEND}
      </legend>
      <RadioGroup
        aria-labelledby={legendId}
        className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6"
        onValueChange={(next) => setMeasurementSystem(next as MeasurementSystem)}
        value={measurementSystemOf(weightUnit)}
      >
        {SYSTEMS.map((system) => (
          <OnboardingRadioOption
            key={system}
            label={MEASUREMENT_SYSTEM_LABELS[system]}
            value={system}
          />
        ))}
      </RadioGroup>
    </fieldset>
  );
}
