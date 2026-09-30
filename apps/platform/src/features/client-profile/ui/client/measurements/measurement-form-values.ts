import {
  MEASUREMENT_FIELDS,
  type MeasurementField,
} from "@eli-coach-platform/domain/measurement";
import {
  toCanonicalMeasure,
  toDisplayMeasure,
  type MeasureUnits,
} from "@eli-coach-platform/domain/unit-preference";

import {
  measurementEntryRequestSchema,
  type MeasurementEntryRequest,
  type MeasurementRow,
} from "~/features/client-profile/contracts/measurements";

type MeasurementFieldId = MeasurementField["id"];

export type MeasurementFormValues = Record<MeasurementFieldId, string>;

const ENTRY_READINGS = {
  weight: "weightKg",
  waist: "waistCm",
  hips: "hipsCm",
  thigh: "thighCm",
  arm: "armCm",
} as const satisfies Record<MeasurementFieldId, keyof MeasurementEntryRequest>;

function displayedReading(
  field: MeasurementField,
  latest: MeasurementRow | undefined,
  units: MeasureUnits,
): string {
  const canonical = latest?.[ENTRY_READINGS[field.id]];

  return canonical === undefined || canonical === null
    ? ""
    : String(toDisplayMeasure(field.kind, canonical, units));
}

export function measurementFormValuesOf(
  latest: MeasurementRow | undefined,
  units: MeasureUnits,
): MeasurementFormValues {
  return Object.fromEntries(
    MEASUREMENT_FIELDS.map((field) => [
      field.id,
      displayedReading(field, latest, units),
    ]),
  ) as MeasurementFormValues;
}

export function measurementEntryOf(
  values: MeasurementFormValues,
  units: MeasureUnits,
): MeasurementEntryRequest {
  const entry: Partial<MeasurementEntryRequest> = {};

  for (const field of MEASUREMENT_FIELDS) {
    const entered = values[field.id].trim();

    if (entered !== "") {
      entry[ENTRY_READINGS[field.id]] = toCanonicalMeasure(
        field.kind,
        Number(entered),
        units,
      );
    }
  }

  return measurementEntryRequestSchema.parse(entry);
}
