import {
  measurementSystemOf,
  type MeasurementSystem,
} from "@eli-coach-platform/domain/unit-preference";
import { ChoiceGroup, ChoiceOption } from "@eli-coach-platform/ui/primitives";
import { useId } from "react";

import { ONBOARDING_LEGEND_CLASS } from "./onboarding-card";
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
  const chooseMeasurementSystem = useUnitPreference(
    (state) => state.chooseMeasurementSystem,
  );

  return (
    <fieldset>
      <legend className={ONBOARDING_LEGEND_CLASS} id={legendId}>
        {LEGEND}
      </legend>
      <ChoiceGroup
        aria-labelledby={legendId}
        className="mt-2"
        onValueChange={(next) => {
          if (isMeasurementSystem(next)) chooseMeasurementSystem(next);
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
