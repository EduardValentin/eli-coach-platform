import {
  UnitPreference,
  type MeasurementSystem,
  type UnitPreferenceSnapshot,
} from "@eli-coach-platform/domain/unit-preference";
import {
  ChoiceGroup,
  ChoiceOption,
  Legend,
} from "@eli-coach-platform/ui/primitives";
import { useId } from "react";

import { useUnitPreference } from "./unit-preference-store";

type MeasurementSystemFieldProps = {
  onChoose: (preference: UnitPreferenceSnapshot) => void;
};

const LEGEND = "How do you measure?";

const MEASUREMENT_SYSTEM_LABELS: Record<MeasurementSystem, string> = {
  metric: "kg · cm",
  imperial: "lb · in",
};

const SYSTEMS: readonly MeasurementSystem[] = ["metric", "imperial"];

function isMeasurementSystem(value: string): value is MeasurementSystem {
  return SYSTEMS.some((system) => system === value);
}

export function MeasurementSystemField({
  onChoose,
}: MeasurementSystemFieldProps) {
  const legendId = useId();
  const preference = useUnitPreference((state) => state.preference);

  return (
    <fieldset>
      <Legend id={legendId}>{LEGEND}</Legend>
      <ChoiceGroup
        aria-labelledby={legendId}
        className="mt-2"
        onValueChange={(next) => {
          if (isMeasurementSystem(next)) {
            onChoose(UnitPreference.of(next).toSnapshot());
          }
        }}
        value={UnitPreference.from(preference).measurementSystem()}
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
