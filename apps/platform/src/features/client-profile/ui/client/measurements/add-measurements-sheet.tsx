import { MEASUREMENT_FIELDS } from "@eli-coach-platform/domain/measurement";
import type { MeasureUnits } from "@eli-coach-platform/domain/unit-preference";
import { ResponsiveSheetDialog } from "@eli-coach-platform/ui/layout";
import { Button } from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRevalidator } from "react-router";

import {
  MEASUREMENTS_COPY,
  type MeasurementRow,
} from "~/features/client-profile/contracts/measurements";
import {
  measurementEntryOf,
  measurementFormValuesOf,
  type MeasurementFormValues,
} from "~/features/client-profile/ui/client/measurements/measurement-form-values";
import { recordMeasurements } from "~/features/client-profile/ui/client/measurements/measurements-api-client";
import { MeasureField } from "~/features/client-profile/ui/shared/measure-field/measure-field";
import {
  ProgressPhotoBlock,
  type ProgressPhotoConsent,
} from "~/features/client-profile/ui/shared/photos/progress-photo-block";
import {
  NO_PROGRESS_PHOTO_PICKS,
  type ProgressPhotoPicks,
} from "~/features/client-profile/ui/shared/photos/progress-photo-picks";

type AddMeasurementsStartingPoint = {
  latest: MeasurementRow | undefined;
  units: MeasureUnits;
  consentedAt: string | null;
};

type AddMeasurementsSheetProps = AddMeasurementsStartingPoint & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SHEET_COPY = MEASUREMENTS_COPY.sheet;

function AddMeasurementsForm({
  latest,
  units,
  consentedAt,
  onClose,
}: AddMeasurementsStartingPoint & { onClose: () => void }) {
  const revalidator = useRevalidator();
  const [photos, setPhotos] = useState<ProgressPhotoPicks>(
    NO_PROGRESS_PHOTO_PICKS,
  );
  const [consentTicked, setConsentTicked] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm<MeasurementFormValues>({
    defaultValues: measurementFormValuesOf(latest, units),
  });

  const consent: ProgressPhotoConsent = consentedAt
    ? { status: "recorded", at: consentedAt }
    : {
        status: "asking",
        ticked: consentTicked,
        onTickedChange: setConsentTicked,
      };

  const save = form.handleSubmit(async (values) => {
    setSaving(true);
    const outcome = await recordMeasurements({
      entry: measurementEntryOf(values, units),
      givesPhotoConsent: consentTicked,
      photos,
    });

    if (outcome.kind === "failed") {
      setSaving(false);
      toast.error(MEASUREMENTS_COPY.toasts.failed);
      return;
    }

    void revalidator.revalidate();
    onClose();
    toast.success(MEASUREMENTS_COPY.toasts.saved);
    outcome.refusedViews.forEach((view) =>
      toast.error(MEASUREMENTS_COPY.toasts.photoRefused(view)),
    );
  });

  return (
    <>
      <div className="shrink-0 border-b border-border-subtle px-5 pt-6 pb-4 md:px-8 md:pt-8">
        <h3 className="pr-10 text-lg leading-snug font-semibold text-text-primary md:text-xl">
          {SHEET_COPY.title}
        </h3>
        <p className="mt-1 text-xs text-text-secondary sm:text-sm">
          {SHEET_COPY.description}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8">
        <form className="grid gap-6" noValidate onSubmit={save}>
          {MEASUREMENT_FIELDS.map((field) => (
            <MeasureField
              control={form.control}
              field={field}
              key={field.id}
              name={field.id}
              units={units}
            />
          ))}

          <ProgressPhotoBlock
            consent={consent}
            onPhotosChange={setPhotos}
            photos={photos}
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row-reverse">
            <Button
              className="w-full sm:w-auto"
              disabled={saving}
              size="md"
              type="submit"
              variant="primary"
            >
              {SHEET_COPY.save}
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={onClose}
              size="md"
              type="button"
              variant="ghost"
            >
              {SHEET_COPY.cancel}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

export function AddMeasurementsSheet({
  open,
  onOpenChange,
  ...startingPoint
}: AddMeasurementsSheetProps) {
  return (
    <ResponsiveSheetDialog
      description={SHEET_COPY.description}
      onOpenChange={onOpenChange}
      open={open}
      title={SHEET_COPY.title}
    >
      <AddMeasurementsForm
        {...startingPoint}
        onClose={() => onOpenChange(false)}
      />
    </ResponsiveSheetDialog>
  );
}
