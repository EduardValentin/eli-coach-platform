import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import type {
  MeasurementDueLine,
  MeasurementRecord,
  ProgressPhotoView,
} from "@eli-coach-platform/domain/client-profile";
import { z } from "zod";

import { subjectPronoun } from "~/features/assessment-calls/contracts/visitor-profile";
import {
  progressPhotoOutcomesSchema,
  progressPhotoViewSchema,
} from "~/features/client-profile/contracts/progress-photo-parts";
import { unitPreferenceSchema } from "~/features/client-profile/contracts/unit-preference";

const measurementRowSchema = z.object({
  id: z.uuid(),
  recordedAt: z.iso.datetime(),
  weightKg: z.number(),
  waistCm: z.number(),
  hipsCm: z.number().nullable(),
  thighCm: z.number().nullable(),
  armCm: z.number().nullable(),
  photos: z.array(z.object({ id: z.uuid(), view: progressPhotoViewSchema })),
});

export type MeasurementRow = z.infer<typeof measurementRowSchema>;

export const measurementHistorySchema = z.array(measurementRowSchema);

const MEASUREMENT_DUE_LINES = [
  "weigh-in",
  "measurements",
] as const satisfies readonly MeasurementDueLine[];

const measurementDueLineSchema = z.enum(MEASUREMENT_DUE_LINES).nullable();

export const measurementsPageSchema = z.object({
  history: measurementHistorySchema,
  consentedAt: z.iso.datetime().nullable(),
  units: unitPreferenceSchema,
  dueLine: measurementDueLineSchema,
});

export type MeasurementsPage = z.infer<typeof measurementsPageSchema>;

export const measurementsNudgeSchema = z.object({
  dueLine: measurementDueLineSchema,
});

export type MeasurementsNudge = z.infer<typeof measurementsNudgeSchema>;

export const RECORD_MEASUREMENTS_FIELDS = {
  entry: "entry",
  photoConsent: "photoConsent",
} as const;

export const PHOTO_CONSENT_GIVEN = "given";

export const measurementEntryRequestSchema = z.object({
  weightKg: z.number(),
  waistCm: z.number(),
  hipsCm: z.number().optional(),
  thighCm: z.number().optional(),
  armCm: z.number().optional(),
});

export type MeasurementEntryRequest = z.infer<
  typeof measurementEntryRequestSchema
>;

export const recordMeasurementsResponseSchema = z.object({
  entryId: z.uuid(),
  photos: progressPhotoOutcomesSchema,
});

export const measurementsRefusalSchema = z.object({
  error: z.literal("not-on-journey"),
});

const PROGRESS_PHOTO_VIEW_LABELS = {
  front: "Front",
  side: "Side",
  back: "Back",
} as const satisfies Record<ProgressPhotoView, string>;

export const MEASUREMENTS_COPY = {
  title: "Measurements",
  empty: (gender: VisitorGender) => {
    const subject = subjectPronoun(gender);

    return `${subject.capitalised} ${subject.hasVerb} not sent any measurements yet.`;
  },
  caption: "Measurements history, newest first",
  columns: ["Date", "Weight", "Waist", "Hips", "Thigh", "Arm", "Ratio"],
  missing: "—",
  client: {
    empty: "Nothing recorded yet. Your first set goes in with your answers.",
    addFirst: "Add your first measurements",
    add: "Add",
  },
  sheet: {
    title: "Add measurements",
    description:
      "Same time of day, same tape, same spots — that is what keeps them comparable.",
    save: "Save measurements",
    cancel: "Cancel",
  },
  photos: {
    caption: "Progress photos",
    optional: "(optional)",
    locked: "Tick the box to add your photos.",
    consented: (date: string) =>
      `You agreed to share progress photos on ${date}.`,
    viewLabels: PROGRESS_PHOTO_VIEW_LABELS,
    addView: (view: ProgressPhotoView) => `Add ${view} photo`,
    addPhoto: "Add photo",
    removeView: (view: ProgressPhotoView) => `Remove ${view} photo`,
    image: (view: ProgressPhotoView) =>
      `${PROGRESS_PHOTO_VIEW_LABELS[view]} photo`,
    refused: "Choose a JPEG, PNG or WebP under 10 MB.",
  },
  photoView: {
    open: "View photos",
    openFrom: (date: string) => `View photos from ${date}`,
    title: (date: string) => `Photos from ${date}`,
    clientDescription: "Only you and your coach can see these photos.",
    coachDescription: (firstName: string) =>
      `Only you and ${firstName} can see these photos.`,
    missing: (view: ProgressPhotoView) => `No ${view} photo`,
    remove: "Remove",
    close: "Close",
  },
  removeConfirm: {
    title: "Remove this photo?",
    description:
      "It is deleted for you and your coach. Your measurements stay.",
    confirm: "Remove",
    cancel: "Keep",
  },
  toasts: {
    saved: "Measurements saved.",
    photoRefused: (view: ProgressPhotoView) =>
      `The ${view} photo could not be processed, so it was not saved.`,
    failed: "Your measurements could not be saved. Try again.",
    removeFailed: "The photo could not be removed. Try again.",
  },
  nudge: {
    "weigh-in": "Your weekly weigh-in is due",
    measurements: "Time for your measurements and photos",
  } satisfies Record<MeasurementDueLine, string>,
} as const;

export function presentMeasurements(
  records: readonly MeasurementRecord[],
): MeasurementRow[] {
  return records.map((record) => ({
    id: record.id,
    recordedAt: record.recordedAt.toISOString(),
    weightKg: record.weightKg,
    waistCm: record.waistCm,
    hipsCm: record.hipsCm ?? null,
    thighCm: record.thighCm ?? null,
    armCm: record.armCm ?? null,
    photos: record.photos.map((photo) => ({ id: photo.id, view: photo.view })),
  }));
}
