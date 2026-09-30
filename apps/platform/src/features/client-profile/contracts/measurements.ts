import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import type { MeasurementEntry } from "@eli-coach-platform/domain/measurement";
import { z } from "zod";

import { subjectPronoun } from "~/features/assessment-calls/contracts/visitor-profile";

const measurementRowSchema = z.object({
  recordedAt: z.iso.datetime(),
  weightKg: z.number(),
  waistCm: z.number(),
  hipsCm: z.number().nullable(),
  thighCm: z.number().nullable(),
  armCm: z.number().nullable(),
});

export type MeasurementRow = z.infer<typeof measurementRowSchema>;

export const measurementRowsSchema = z.array(measurementRowSchema);

export const MEASUREMENTS_COPY = {
  title: "Measurements",
  empty: (gender: VisitorGender) => {
    const subject = subjectPronoun(gender);

    return `${subject.capitalised} ${subject.hasVerb} not sent any measurements yet.`;
  },
  caption: "Measurements history, newest first",
  columns: ["Date", "Weight", "Waist", "Hips", "Thigh", "Arm", "Ratio"],
  missing: "—",
} as const;

export function presentMeasurements(
  measurements: readonly MeasurementEntry[],
): MeasurementRow[] {
  return measurements.map((entry) => ({
    recordedAt: entry.recordedAt.toISOString(),
    weightKg: entry.weightKg,
    waistCm: entry.waistCm,
    hipsCm: entry.hipsCm ?? null,
    thighCm: entry.thighCm ?? null,
    armCm: entry.armCm ?? null,
  }));
}
