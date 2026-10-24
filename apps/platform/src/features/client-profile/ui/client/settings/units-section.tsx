import {
  measureUnitLabel,
  measureUnitsOf,
  toDisplayMeasure,
  type UnitPreferenceSnapshot,
} from "@eli-coach-platform/domain/client-settings";
import {
  SettingsRow,
  SettingsRows,
  SettingsSection,
} from "@eli-coach-platform/ui/portal";
import { ChoiceGroup, ChoiceOption } from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useEffectEvent } from "react";
import { useFetcher } from "react-router";

import { CLIENT_PROFILE_API_PATHS } from "~/features/client-profile/public/paths";
import { unitPreferenceSchema } from "~/features/client-profile/public/unit-preference";
import { PROFILE_SAVE_TOASTS } from "~/features/client-profile/ui/shared/profile/profile-form-section";

type UnitsSectionProps = {
  units: UnitPreferenceSnapshot;
  sample: { weightKg: number | null; heightCm: number | null };
};

const NEUTRAL_SAMPLE = { weightKg: 66.1, heightCm: 165 };

const CM_PER_INCH = 2.54;

const INCHES_PER_FOOT = 12;

type UnitChange = Partial<Record<keyof UnitPreferenceSnapshot, string>>;

function weightSample(weightKg: number, preference: UnitPreferenceSnapshot) {
  const units = measureUnitsOf(preference);

  return `${toDisplayMeasure("weight", weightKg, units)} ${measureUnitLabel("weight", units)}`;
}

function heightSample(heightCm: number, preference: UnitPreferenceSnapshot) {
  if (preference.heightUnit === "cm") {
    const units = measureUnitsOf(preference);

    return `${toDisplayMeasure("height", heightCm, units)} ${measureUnitLabel("height", units)}`;
  }

  const inches = Math.round(heightCm / CM_PER_INCH);

  return `${Math.floor(inches / INCHES_PER_FOOT)}'${inches % INCHES_PER_FOOT}"`;
}

function useUnitPreferenceSave(saved: UnitPreferenceSnapshot) {
  const { data, json, state, submit } = useFetcher<unknown>();
  const pending = unitPreferenceSchema.safeParse(json);
  const shown = state !== "idle" && pending.success ? pending.data : saved;

  const refuse = useEffectEvent(() => {
    toast.error(PROFILE_SAVE_TOASTS.unsaved);
  });

  useEffect(() => {
    if (data !== undefined && data !== null) {
      refuse();
    }
  }, [data]);

  const save = (change: UnitChange) => {
    const preference = unitPreferenceSchema.safeParse({ ...shown, ...change });

    if (!preference.success) return;

    void submit(preference.data, {
      action: CLIENT_PROFILE_API_PATHS.unitPreference,
      encType: "application/json",
      method: "put",
    });
  };

  return { shown, save };
}

export function UnitsSection({ units, sample }: UnitsSectionProps) {
  const { shown, save } = useUnitPreferenceSave(units);
  const weightKg = sample.weightKg ?? NEUTRAL_SAMPLE.weightKg;
  const heightCm = sample.heightCm ?? NEUTRAL_SAMPLE.heightCm;

  return (
    <SettingsSection
      description="Preferences are saved to this device."
      headingId="units-heading"
      icon={SlidersHorizontal}
      title="Units & Measurements"
    >
      <SettingsRows>
        <SettingsRow
          description="Used for weight, training loads, and workout volume."
          hint={`e.g. ${weightSample(weightKg, shown)}`}
          labelId="weight-unit-label"
          title="Body weight & loads"
        >
          <ChoiceGroup
            aria-labelledby="weight-unit-label"
            className="w-full max-w-[240px]"
            onValueChange={(weightUnit) => save({ weightUnit })}
            value={shown.weightUnit}
          >
            <ChoiceOption aria-label="Kilograms" value="kg">
              kg
            </ChoiceOption>
            <ChoiceOption aria-label="Pounds" value="lb">
              lb
            </ChoiceOption>
          </ChoiceGroup>
        </SettingsRow>

        <SettingsRow
          description="Used wherever height is shown."
          hint={`e.g. ${heightSample(heightCm, shown)}`}
          labelId="height-unit-label"
          title="Height"
        >
          <ChoiceGroup
            aria-labelledby="height-unit-label"
            className="w-full max-w-[240px]"
            onValueChange={(heightUnit) => save({ heightUnit })}
            value={shown.heightUnit}
          >
            <ChoiceOption aria-label="Centimetres" value="cm">
              cm
            </ChoiceOption>
            <ChoiceOption aria-label="Feet and inches" value="ft-in">
              ft·in
            </ChoiceOption>
          </ChoiceGroup>
        </SettingsRow>
      </SettingsRows>
    </SettingsSection>
  );
}
