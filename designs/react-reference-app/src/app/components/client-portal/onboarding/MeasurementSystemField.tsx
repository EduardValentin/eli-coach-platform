import { useId } from 'react';
import { useUnitPreferences } from '../../../context/UnitPreferencesContext';
import {
  MEASUREMENT_SYSTEM_LABELS,
  measurementSystemOf,
  type MeasurementSystem,
} from '../../../utils/units';
import { ChoiceGroup, ChoiceOption } from '../../ChoiceGroup';
import { ONBOARDING_LEGEND_CLASS } from './onboardingCard';

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
      <ChoiceGroup
        aria-labelledby={legendId}
        className="mt-2"
        onValueChange={(next) =>
          setMeasurementSystem(next as MeasurementSystem)
        }
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
