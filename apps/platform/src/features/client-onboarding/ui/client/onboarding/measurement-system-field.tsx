import {
  measurementSystemOf,
  unitPreferenceOf,
  type MeasurementSystem,
} from "@eli-coach-platform/domain/unit-preference";
import {
  ChoiceGroup,
  ChoiceOption,
  Legend,
} from "@eli-coach-platform/ui/primitives";
import { useId } from "react";

import { saveUnitPreference } from "./onboarding-api-client";
import { useUnitPreference } from "./unit-preference-store";

const LEGEND = "How do you measure?";

const MEASUREMENT_SYSTEM_LABELS: Record<MeasurementSystem, string> = {
  metric: "kg · cm",
  imperial: "lb · in",
};

const SYSTEMS: readonly MeasurementSystem[] = ["metric", "imperial"];

function isMeasurementSystem(value: string): value is MeasurementSystem {
  return SYSTEMS.some((system) => system === value);
}

export function MeasurementSystemField() {
  const legendId = useId();
  const preference = useUnitPreference((state) => state.preference);
  const choosePreference = useUnitPreference((state) => state.choosePreference);

  const chooseSystem = (system: MeasurementSystem) => {
    const chosen = unitPreferenceOf(system);
    choosePreference(chosen);
    void saveUnitPreference(chosen);
  };

  return (
    <fieldset>
      <Legend id={legendId}>{LEGEND}</Legend>
      <ChoiceGroup
        aria-labelledby={legendId}
        className="mt-2"
        onValueChange={(next) => {
          if (isMeasurementSystem(next)) chooseSystem(next);
        }}
        value={measurementSystemOf(preference)}
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
